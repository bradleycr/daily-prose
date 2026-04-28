type LoadingGlyphProps = {
  label?: string;
  className?: string;
};

export function LoadingGlyph({ label = "loading", className }: LoadingGlyphProps) {
  return (
    <div className={className} aria-label={label} role="status">
      <svg className="dp-breathe" viewBox="0 0 60 16" aria-hidden="true">
        <circle className="dp-dot dp-dot-1" cx="10" cy="8" r="3" />
        <circle className="dp-dot dp-dot-2" cx="30" cy="8" r="3" />
        <circle className="dp-dot dp-dot-3" cx="50" cy="8" r="3" />
      </svg>
    </div>
  );
}

