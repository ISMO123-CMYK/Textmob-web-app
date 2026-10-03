// Hand-off from the native share sheet (ShareToTextmobScreen) to the Louda
// store: the share overlay sits outside the Louda provider, so the payload is
// parked here and consumed once Chats mounts (or immediately if it already is).

export interface PendingChatShareFile {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
}

export interface PendingChatShare {
  text: string;
  files: PendingChatShareFile[];
}

let pending: PendingChatShare | null = null;
const subs = new Set<(p: PendingChatShare) => void>();

export function setPendingChatShare(p: PendingChatShare | null): void {
  pending = p;
  if (!p) return;
  if (subs.size === 0) return;
  const deliver = pending;
  if (!deliver) return;
  pending = null;
  for (const cb of [...subs]) cb(deliver);
}

export function subscribePendingChatShare(cb: (p: PendingChatShare) => void): () => void {
  subs.add(cb);
  if (pending) {
    const deliver = pending;
    pending = null;
    cb(deliver);
  }
  return () => {
    subs.delete(cb);
  };
}
