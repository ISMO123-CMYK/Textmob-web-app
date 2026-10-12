# TextDB — Supabase-compatible database layer (SQLite + Backblaze B2)

TextDB replaces both Supabase projects with a local SQLite query engine + Backblaze B2
for durability. `server.js` code didn't change — the shim implements the supabase-js
query builder surface the app already uses.

```
server.js ──> supabase / supabase2 (shim clients)
                 │
                 ▼
          textdb/shim.js        chainable query builder (from/select/eq/in/contains/order/…)
                 │                  • builds SQL, binds params (no injection)
                 │                  • embeds: users(...) with FK heuristics
                 │                  • thenable { data, error, count } — same as supabase-js
                 ▼
          textdb/engine.js      SQLite (node:sqlite, WAL) — prepared statements,
                 │                  schema inference, auto-ALTER columns, transactions
                 ▼
   ┌────────────┼────────────────────────┐
   ▼            ▼                        ▼
 textdb/     textdb/outbox.js       textdb/replicator.js
 lru.js      write-behind           periodic full snapshots
 96MB cap    row events → B2        VACUUM INTO → gzip → B2
 24h TTL     data/<ns>/<tbl>/<id>.json
```

## Files

| File | Job |
|---|---|
| `textdb/engine.js` | SQLite engine: WAL, prepared-stmt cache, schema inference (text/num/bool/json), auto-create columns, insert/upsert, transactions, VACUUM INTO, admin schema ops (listTables/tableInfo/addColumn/dropColumn/dropTable/enqueueOutbox) |
| `textdb/shim.js` | `TextDbClient` + `QueryBuilder` — drop-in for supabase-js. Filters: eq/neq/gt/gte/lt/lte/in/is/like/ilike/not/or/contains (PostgREST `@>` via json_each). Embeds via FK-name heuristics (`user_id`→users, `username`→users, `group_id`→groups…). Read cache in LRU (default 30s per query, 24h row TTL, byte-capped). Refuses unfiltered update/delete. |
| `textdb/lru.js` | Byte-capped LRU (default 96MB) with TTL + prefix invalidation |
| `textdb/outbox.js` | `OutboxWorker` — drains `__outbox` tables every 500ms → B2 `PutObject` as one JSON per row. 3 retries (4s/16s/64s backoff) → `__outbox_failed` dead-letter table. |
| `textdb/replicator.js` | `Replicator` — every 5 min: `VACUUM INTO` each engine → gzip → `snapshots/<ns>/snap-<ts>.db.gz` + `manifest-<ns>.json` (sha256). Keeps last 10. |
| `textdb/b2.js` | B2 client (native API, zero deps): authorize, upload (sha1 header), paginated list, delete. Falls back to local-dir emulation when `TEXTDB_B2_*` unset. |
| `textdb/index.js` | `openTextDbSync()` — opens engines, restore-on-boot from B2 if local DB missing, starts outbox+replicator, SIGTERM flush+snapshot. Exposes `supabase` and `supabase2` (same single-DB client), `stats()`. |
| `textdb/admin.js` + `admin.html` | Dashboard at `/blackbaze-admin` (see below). |
| `textdb/scripts/migrate-all.js` | **Full migration** from both legacy Supabase projects into the single engine (3,585 rows). |
| `textdb/scripts/seed-ismailg.js` | Superseded by migrate-all.js (early single-user seed). |
| `textdb/scripts/cleanup-b2.js` | One-off B2 cleanup helper (paginated delete). |
| `textdb/scripts/test-textdb.js` | 39-check suite: CRUD, filters, embeds, outbox drain, snapshot, wipe+restore. |
| `textdb/scripts/test-contains.js` | 7-check suite for the `contains` operator. |

## One database (merged from the two Supabase projects)

Both legacy clients point at the SAME engine — the old project split is gone:

| Client var | Now points to | Historically was |
|---|---|---|
| `supabase` | TextDB `main` engine | Supabase project 1 (users, Messages, verification_requests, redemption_queue, app_versions, negative_signals) |
| `supabase2` | TextDB `main` engine (same) | Supabase project 2 (Posts, groups, live_rooms, live_room_messages) |
| `loudaSupabase` | **Real Supabase** (`LOUDA_SUPABASE_URL/KEY`) — never TextDB | own project (groups, users for the Louda app) |

Table name sets never overlapped between the two projects, so the merge was conflict-free.
Migrated 2026-10-11: 338 users, 3,195 Posts, 5 verification_requests, 6 redemption_queue,
1 app_versions, 12 negative_signals, 4 live_rooms, 24 live_room_messages, empty Messages/groups.

Engine file: `server/data/textdb/main.db` (single SQLite). Namespace in B2 paths: `main`.

## How a read flows

1. `supabase.from('users').select('*').eq('username','x')` → shim builds
   `SELECT * FROM "users" WHERE "username" = ?` with bound params.
2. LRU checked (30s per-query TTL) → hit = return instantly.
3. Table missing or column missing → Postgres-like NULL semantics (`0=1` for comparisons), never throws.
4. Result `{ data, error, count }` — same shape as supabase-js. `.single()` throws PGRST116 when 0 rows, like Supabase.

## How a write syncs to B2

1. `insert/update/delete` runs inside a SQLite transaction on the engine.
2. Same transaction enqueues one `__outbox` row: `{op, ns, tbl, key, payload}`.
3. `OutboxWorker` (every 500ms) uploads each event as
   `data/<ns>/<table>/<row-id>.json` to B2, then deletes the `__outbox` row.
4. Failed 3× → moved to `__outbox_failed` (inspect via admin dashboard / raw SQL), never lost silently.
5. Every 5 min `Replicator` also uploads a full compressed snapshot per namespace + manifest.

So B2 holds two layers: **row-level events** (near-real-time) and **periodic full snapshots** (cheap restores).

## Restore on boot

- Local DB file missing (fresh Render deploy, wiped disk)? → download latest snapshot
  from B2 (manifest → gzip stream → sha256 verify → rename), then **replay** any
  `data/<ns>/…` objects newer than the snapshot timestamp.
- Local DB present? → open directly (fast path; B2 is just cold storage).

## Admin dashboard — `/blackbaze-admin`

Password: `TEXTDB_ADMIN_PASSWORD` (default `1375`). Login issues an HMAC-SHA256
stateless token (12h expiry, timing-safe compare, 5 attempts/min rate limit).
All data routes require `Authorization: Bearer <token>`.

| Action | How |
|---|---|
| See tables + row counts | Overview page (main namespace — single database) |
| Create table | `+ New table` — name + columns as `name:type` (text/num/bool/json). `id` (uuid) and `created_at` added automatically. |
| Add/drop column | Table page — chips with ✕ to drop |
| Browse rows | Paginated grid, newest first |
| Insert / edit / delete row | Buttons per row — writes go through engine + outbox → synced to B2 like app writes |
| Snapshot now | Uploads full DB snapshots to B2 immediately |
| Flush outbox | Forces pending row events to B2 |
| Browse B2 objects | Lists everything in the bucket |

**Tables you create here are live immediately** — `server.js` reads through the same
engines, no restart needed. New tables live in the namespace you picked; the shim's
`from('your_table')` will find them (schema inference auto-extends on first write,
and admin-created tables have explicit schemas from day one).

### Creating tables from code

```js
// via shim (auto-creates table + columns from the first inserted row):
await supabase.from('my_table').insert({ title: 'hi', count: 3 });
// → table my_table(id TEXT PK, title TEXT, count NUMERIC, created_at, timestamp)
// future rows may add more columns automatically (auto-ALTER)

// via admin dashboard: Overview → + New table → explicit column types
```

One namespace only: everything goes into the `main` engine. New tables appear in the
admin dashboard automatically on first write or when created there.

## Environment

```
TEXTDB_ENABLED=true              # false → original Supabase clients (rollback)
TEXTDB_DIR=server/data/textdb    # local engine files
TEXTDB_B2_KEY_ID=…               # B2 application key (bucket-scoped)
TEXTDB_B2_APP_KEY=…              # B2 secret
TEXTDB_B2_BUCKET=TextDB          # bucket name (case-sensitive)
TEXTDB_QUERY_TTL_MS=30000        # per-query LRU TTL
TEXTDB_LRU_MAX_MB=96             # hot-cache byte cap
TEXTDB_TTL_MS=86400000           # row TTL in LRU (24h)
TEXTDB_OUTBOX_INTERVAL_MS=500    # row-event drain interval
TEXTDB_SNAPSHOT_INTERVAL_MS=300000  # full snapshot every 5 min
TEXTDB_SNAPSHOT_KEEP=10          # snapshots kept per namespace
TEXTDB_ADMIN_PASSWORD=1375       # dashboard password
```

## B2 bucket layout (`TextDB`)

```
manifest-main.json                       latest snapshot pointer + sha256
snapshots/main/snap-<ts>.db.gz          full engine (all tables), gzipped
data/main/users/<uuid>.json             row events (outbox, incremental)
data/main/Posts/<uuid>.json
data/main/<table>/<row-id>.json
```

## Rollback

Set `TEXTDB_ENABLED=false` in `.env` → server.js uses the original Supabase clients
again. Both Supabase projects were never written to by TextDB (seed script is
read-only against Supabase), so they remain exactly as they were.

## MemoryDB

Archived at `archive/memorydb/MemoryDB.js` (disabled in server.js). It pre-loaded
all rows into RAM to hide Supabase latency — unnecessary with local SQLite and
dangerous at scale (unbounded RAM). All ~40 call sites were guarded; feed falls
back to indexed SQL. Restore = move file back + re-enable the two lines in server.js.
