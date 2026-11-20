/**
 * Apple's activity indicator: eight spokes, each fading as the next lights, clockwise (iOS
 * UIActivityIndicatorView). Size from the font size (`text-2xl`), colour from the text colour.
 * Shapes and timing: ui.css `.ui-activity`.
 */
export default function ActivityIndicator({ className = '' }: { className?: string }) {
  return (
    <span role="progressbar" aria-label="Loading" className={`ui-activity ${className}`}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${(i - 8) * 0.1}s` }} />
      ))}
    </span>
  );
}
