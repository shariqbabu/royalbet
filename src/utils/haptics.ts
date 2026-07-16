// src/utils/haptics.ts
// Mobile haptic feedback — real casino apps ka signature feel
export const haptic = (pattern: 'light' | 'medium' | 'win' | 'urgent' = 'light') => {
  if (!navigator.vibrate) return;
  const patterns: Record<string, number | number[]> = {
    light:  10,
    medium: 25,
    win:    [40, 60, 40, 60, 100],
    urgent: [15, 40, 15],
  };
  navigator.vibrate(patterns[pattern]);
};
