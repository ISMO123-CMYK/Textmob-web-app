// Small cross-component buses (kept outside components to avoid import cycles)
export const chatMessagesJumpRef: { current: ((id: string) => void) | null } = {
  current: null,
};
