import { LoadingGlyph } from "@/components/LoadingGlyph";

type LoadingOverlayProps = {
  open: boolean;
  label?: string;
};

export function LoadingOverlay({ open, label = "loading" }: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div className="dp-loading-overlay" role="status" aria-label={label}>
      <div className="dp-loading-surface">
        <LoadingGlyph label={label} className="text-[color:var(--muted)]" />
        <p className="dp-loading-label">daily prose</p>
      </div>
    </div>
  );
}

