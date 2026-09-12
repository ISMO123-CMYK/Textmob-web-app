import * as Haptics from 'expo-haptics';

export function playClick() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
