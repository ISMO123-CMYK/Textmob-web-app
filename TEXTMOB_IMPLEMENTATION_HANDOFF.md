# Textmob implementation handoff

**Prepared:** 6 November 2026  
**Repository:** ISMO123-CMYK/Textmob-web-app  
**Branch:** main  
**Latest verified main commit at preparation:** 399668c27c74803215731a3ca8d03e6c0dd188b8

## Why this document exists

This handoff records the implementation work completed across the two most recent Textmob work sessions. It is intended for a developer or assistant joining the project without the earlier chat history.

It separates:
- Features and fixes already committed to main.
- Product rules reflected in the implementation.
- Setup and verification still required.
- Known gaps that must not be mistaken for completed work.

This is a repository implementation record, not a claim that the live production deployment has been fully tested.

## 1. Work committed to main

The implementation was pushed directly to main, following the project instruction to avoid creating another feature branch or waiting for a pull request.

| Commit | Summary |
| --- | --- |
| 2b2efb46997e2bbbb7589c46c01a2cc0e623548b | Applied the Textmob Plus, Markdown-first composer, MobUI, earnings, membership and related server changes. Also corrected hashtag extraction, content-format handling and the earnings balance display. |
| 399668c27c74803215731a3ca8d03e6c0dd188b8 | Removed the account-deletion panel and action from Accounts Center, leaving the logout action. |
| fc99c7e69eaf8af17d4bb83311933a35085ed881 | Standardized post and Snap author badge data on the existing users.verified status and normalized API values to booleans. |
| 854b58794a25c7c7704fb57aad3abeb936a2c757 | Removed Individual/Organisation pills from post cards and returned post cards to the canonical blue-tick status. |
| 33a3039c16dbedb3f14229fb110dd4527d749021 | Applied the canonical verified status to Snap surfaces and removed the ORG pill from Snap cards. |
| 9c10ca0dc49bf6d9102df035ab7ccd12fb9fb63e | Normalized users.verified values in the shared profile cache. |

Commit links:
- https://github.com/ISMO123-CMYK/Textmob-web-app/commit/2b2efb46997e2bbbb7589c46c01a2cc0e623548b
- https://github.com/ISMO123-CMYK/Textmob-web-app/commit/399668c27c74803215731a3ca8d03e6c0dd188b8

The earlier pull request #1 was closed after its changes were applied directly to main. It was not merged as a pull request, so the same changes would not be integrated twice:
https://github.com/ISMO123-CMYK/Textmob-web-app/pull/1

## 2. Textmob Plus membership

The product-facing plan is called **Textmob Plus**, not a generic verification subscription.

Implemented rules:
- Price: **₦1,000 for one month**.
- Only Organisation accounts can join.
- The checkout endpoint rejects Individual accounts.
- An account is treated as an active Plus member only when it has the verified flag and an accepted verification request whose verified-until date is still in the future.
- An account with an expired membership must not receive active Plus-only features.
- The server has an hourly cleanup worker that marks expired accepted verification requests as EXPIRED and clears the user's verified flag.
- The admin verification approval flow sets a one-month verification period.
- The checkout uses the existing DevPay integration and the Textmob Plus checkout configuration.

Plus features reflected in the UI and server:
- Verified badge on the account and its content.
- MobUI Studio for interactive post components.
- AI-assisted post writing.
- A modest feed-discovery multiplier of 1.12 for active Plus authors. This is a ranking weight, not a guaranteed reach promise.

The Plus checkout is implemented at /api/devpay/checkout. Membership status is read through /api/devpay/verification-status. The AI writing endpoint is /api/plus/ai-post.

## 3. Markdown-first post composer

New posts are submitted with content_format set to markdown.

The composer now:
- Uses a Markdown text editor instead of relying on contentEditable HTML as the new-post format.
- Gives Free users the basic bold control.
- Shows additional formatting and Plus tools to active Plus users.
- Provides a Markdown/MobUI preview.
- Keeps the post text as the source content instead of converting every new post into saved HTML.
- Supports drag-and-drop media into the composer.
- Accepts up to 10 photos or one video, with a 100 MB per-file limit. Mixed photo and video uploads are rejected by the server.

The create workspace in Accounts Center combines **Write post** and **Snap Studio** as two subtabs under Create.

### Existing post compatibility

Old posts may contain saved HTML. Those posts must continue to render.

The implementation uses:
- content_format = markdown for new Markdown/MobUI posts.
- content_format = legacy for older HTML posts.
- A fallback detector for older posts that do not yet have a content_format value.
- Marked to convert Markdown to HTML.
- DOMPurify to sanitize generated HTML.
- A legacy rendering path for stored HTML content.

The database migration adds content_format to the Posts table with a default of legacy so existing rows keep their original interpretation.

## 4. MobUI editor and renderer

MobUI is stored inside the Markdown post body using a component marker, a JSON payload and a closing marker.

Conceptual format:

~~~text
:::mobui quiz
{
  "question": "Example question",
  "options": ["First option", "Second option"],
  "answerIndex": 0
}
:::
~~~

The implemented component types are:
1. quiz
2. chart
3. flowchart
4. table
5. calculator
6. timeline
7. checklist
8. decision
9. accordion
10. poll
11. flashcards
12. cards
13. callout
14. slides
15. code
16. palette

MobUI Studio includes:
- A component picker.
- Form-based fields for supported components.
- A source mode for editing the JSON.
- A live preview.
- An insert action that places the generated block into the post.

The renderer splits ordinary Markdown from MobUI blocks and renders each section appropriately. Interactive polls have server endpoints for loading results and saving a user's selected option.

### Server-side MobUI restrictions

The server checks MobUI blocks on normal post creation, post editing and group post creation. Publishing interactive blocks requires:
- An Organisation account.
- The verified flag.
- An accepted, unexpired Plus membership.
- A supported component type.
- A closing marker.
- Valid JSON object data.
- A component payload within the configured size limit.

These checks are important because hiding the MobUI button in the browser is not sufficient access control.

## 5. Textmob Plus AI writing

The composer has an AI writing helper for Plus members.

It accepts:
- A prompt or an existing draft.
- A writing tone.
- A mode for a normal Markdown post or an interactive MobUI post.

The backend checks that the requesting account is an Organisation account with active Plus status before generating content.

The generation instructions require Markdown and the supported MobUI JSON format. They also tell the model not to return HTML, scripts, JSX, iframes or fabricated statistics, chart data, quotations or sources.

The endpoint returns Markdown content for the composer to preview and edit before publishing. The generated result is not automatically published.

## 6. Hashtag extraction and post-format storage

The server now extracts hashtags from the post's text rather than blindly storing every hashtag-like string it finds.

The extractor:
- Ignores fenced code blocks.
- Ignores MobUI JSON payloads.
- Removes HTML tags before extracting.
- Normalizes hashtags to lowercase.
- Deduplicates repeated hashtags.

The parser is used when creating posts and when editing posts. The edit route also preserves the content format, so editing an old HTML post does not silently convert its stored content into the new Markdown format.

Group post creation was also updated to use the canonical hashtag extraction and MobUI validation path.

**Important distinction:** this fixes and standardizes server-side hashtag storage. It does not prove that the composer autocomplete duplication issue is fixed. The autocomplete behavior still needs a browser reproduction and test.

## 7. Mobcoin earnings and withdrawals

### Post-like reward rule

The server's post-like handler awards:
- **100 Mobcoins at each new five-like milestone on a post.**
- The account owner does not earn a reward by liking their own post.
- A reward is only considered when a new like reaches a multiple of five.
- A reward ledger row is inserted using a post-and-milestone identifier before crediting the balance. This is intended to prevent duplicate payment for the same milestone.
- The ledger is marked paid after the Mobcoins are credited.

The account migration creates the mobcoin_reward_events ledger table.

### Earnings dashboard

The Accounts Center earnings view now:
- Fetches the current Mobcoin balance from /api/user/stats instead of treating historical likes as an actual wallet balance.
- Displays available Mobcoins and their naira estimate.
- Displays total likes and milestone counts.
- Separates post and snap milestone counts in the dashboard.
- Shows per-post progress such as 3/5 toward the next 100 Mobcoins.
- Shows payout history.
- Provides bank-transfer and airtime withdrawal flows.

### Withdrawal rules

The server requires:
- An Organisation account.
- The verified flag.
- An accepted, unexpired Textmob Plus membership.
- At least 2,000 Mobcoins to meet the minimum redemption.
- The existing withdrawal timing and pending-request restrictions.

These rules are checked by the server, not only by the dashboard buttons.

### Known reward gap: Snap milestones

Do not announce Snap-like rewards as fully implemented yet.

The dashboard currently calculates and displays snap milestone counts, but the verified server reward handler awards Mobcoins in the post-like route. No equivalent Snap-like reward credit path was found during this review.

The Snap reward path must be implemented and tested before saying that each five Snap likes pays 100 Mobcoins. Until then, the reliable implemented reward is the five-like milestone on posts.

## 8. Account identity, badges and account-deletion UI

### Organisation and Individual labels

Account type remains part of account and eligibility settings, but Individual/Organisation labels are not displayed on post cards or Snap cards. The pills were removed from the post author header and Snap author surface.

### Verified badges and Textmob Plus branding

The blue tick display uses the existing users.verified field that powers Textmob's original verification tracking. Textmob Plus is the product-facing name in the frontend; it does not use a separate __plusVerified badge field.

The post feed enriches post authors with a normalized boolean verified value from the users table. The Snap feed, Snap search, single-Snap endpoint, profile endpoint and profile-picture endpoint also normalize the value so boolean and string database representations render consistently.

The existing Plus lifecycle remains tracked through verification_requests.verified_until, the users.verified flag and the expiry cleanup. The discovery multiplier uses the canonical verified status.

### Account deletion

The Delete Account panel and its client-side deactivation action were removed from Accounts Center. The remaining Account danger area exposes logout.

This means the account-deletion action is no longer available through that Accounts Center screen. It does **not** mean user data was deleted, and this change did not constitute a complete audit or removal of every possible backend account-deletion route.

## 9. Main files changed or relevant to this work

| File | Responsibility |
| --- | --- |
| server.js | Plus checkout and membership checks, expiry cleanup, MobUI validation, AI writing endpoint, poll endpoints, hashtag extraction, content-format handling, post reward ledger and withdrawal gates. |
| client/src/pages/AccountsCenter.jsx | Plus membership screen, organisation gating, Create subtabs, earnings balance and milestone dashboard, withdrawal UI, logout-only danger area. |
| client/src/pages/posts/MakePostContent.jsx | Markdown-first composer, basic/Plus formatting controls, MobUI and AI writer entry points, media drag-and-drop. |
| client/src/components/ui/MobUIBuilder.jsx | MobUI component selection, field editor, source mode and live preview. |
| client/src/components/ui/MobUIRenderer.jsx | Markdown/MobUI rendering and interactive component behavior. |
| client/src/utils/mobui.js | MobUI block parsing and generation, supported types, Markdown rendering and sanitization helpers. |
| client/src/components/ui/RichText.jsx | Markdown-first rendering with compatibility for legacy HTML posts. |
| client/src/components/ui/PostCard.jsx | Active Plus badge behavior, account-type label and post content format rendering. |
| client/src/pages/snaps/SnapsContent.jsx | Active Plus badge behavior in Snap surfaces. |
| client/package.json | Adds DOMPurify as a client dependency. |
| server/migrations/20261106_textmob_plus_account_db.sql | Reward ledger and MobUI poll vote tables. |
| server/migrations/20261106_textmob_posts_db.sql | Adds Posts.content_format. |

## 10. Database setup

The current server code uses TextDB by default unless TEXTDB_ENABLED is explicitly set to the string false.

### When TextDB is enabled

- The server opens the TextDB adapter.
- The legacy Supabase client interfaces point to the TextDB-backed adapter.
- The migration files state that TextDB creates the required tables and columns dynamically.
- Do not run the two Supabase SQL migration files against a separate Supabase project when the application is using TextDB mode.

### When TEXTDB_ENABLED=false

The server uses the original Supabase clients. Apply the migrations to the correct projects:

1. Apply server/migrations/20261106_textmob_plus_account_db.sql to the account database configured by SUPABASE_URL and SUPABASE_KEY. It creates mobcoin_reward_events and mobui_poll_votes, enables row-level security and limits table access to service_role.
2. Apply server/migrations/20261106_textmob_posts_db.sql to the posts database configured by SUPABASE_2_URL and SUPABASE_2_KEY. It adds Posts.content_format.

The migrations were committed, but they were not executed as part of this work.

## 11. Not completed or not verified

The following points must remain open until tested or implemented:

1. **Snap rewards:** dashboard progress is displayed, but server-side Mobcoin crediting currently exists for post likes, not Snap likes.
2. **Hashtag autocomplete:** canonical database extraction is implemented, but the original autocomplete duplicate-insertion behavior has not been confirmed fixed in a browser.
3. **Named post viewers:** no private list of viewer usernames was added. Existing aggregate view counts remain. The current username-based API pattern accepts usernames supplied by the browser in some flows; a trusted signed identity/session model is needed before exposing private viewer identities.
4. **Account-deletion backend:** the Accounts Center control was removed, but the entire backend route surface was not audited or removed.
5. **Full desktop UI audit:** this work updated the Plus, earnings, Create and related components. It did not complete a full visual audit and redesign of every older desktop screen.
6. **Runtime checks:** no successful local dependency install, production client build, live DevPay checkout, webhook test, database migration run or end-to-end browser test was completed during these commits.
7. **Deployment:** GitHub confirms the commits are on main. That alone does not prove that the live hosting service has deployed them successfully.

### Authentication and data-trust note

Some existing APIs in this project identify an account using a username supplied by the client. The new features follow parts of that existing request pattern. Before expanding sensitive features such as private viewer identities or financial actions, confirm that the server derives the acting user from a trusted authenticated session rather than trusting a browser-provided username.

## 12. Recommended next engineering steps

1. Install dependencies and run the client production build. Resolve any compile, lint or runtime errors before deployment.
2. Confirm whether production uses TextDB or Supabase. Apply the correct schema setup and verify that the reward ledger, poll votes and content_format are available.
3. Test the full Plus lifecycle: Organisation eligibility, ₦1,000 checkout, successful payment webhook, active membership status, badge display and expiry.
4. Test Markdown, legacy HTML, MobUI creation, MobUI editing, group posts and poll voting.
5. Test a post at 4, 5, 9 and 10 likes to verify one-time 100-Mobcoin credits at each new milestone. Implement and separately test the missing Snap reward path.
6. Reproduce the hashtag autocomplete issue, then verify both the inserted editor text and the saved database hashtag array after create and edit.
7. Review username-based API identity checks before exposing named viewer data or relying on client-supplied identity for sensitive actions.
8. Complete the remaining desktop screen review and separately verify the live deployment.

## 13. Scope note

The most recent instruction was to focus on the web application and leave the native/mobile app work aside. No React Native parity work is represented by this handoff.

The main branch is the source of truth for this implementation. Fetch the latest main commit before making additional changes, and continue committing directly to main unless the project owner changes that instruction.
