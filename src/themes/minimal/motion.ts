// Apple-style springs (SwiftUI's .smooth and .snappy): defined by duration and bounce, so a
// movement interrupted halfway carries its speed into the next one instead of restarting.
export const smooth = { type: 'spring', bounce: 0, duration: 0.45 } as const;
export const snappy = { type: 'spring', bounce: 0.15, duration: 0.35 } as const;
// Apple's ease-out, for fades that are not movement.
export const easeOut = [0.32, 0.72, 0, 1] as const;
