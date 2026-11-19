// Start downloading the player code on Play, while the server resolves the movie link.
// Dynamic imports share the module download with React.lazy. No video is requested here.
export const loadVideoPlayer = () => import('@/components/organisms/video/VideoPlayer');
export const warmVideoPlayer = () => { void loadVideoPlayer().catch(() => {}); };
