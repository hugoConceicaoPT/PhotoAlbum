interface SkeletonProps {
  count?: number;
}

/** Loading placeholders in the shape of an album card. Designed by the frontend (no Figma state design). */
export function AlbumSkeletons({ count = 3 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="pm-card pm-skeleton" aria-hidden="true">
          <div className="pm-mosaic">
            {[0, 1, 2, 3].map((n) => (
              <span key={n} className="pm-mosaic-empty" />
            ))}
          </div>
          <div className="pm-skeleton-lines">
            <span />
            <span />
          </div>
        </li>
      ))}
    </>
  );
}

interface PanelProps {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  role?: "alert" | "status";
}

/** Shared panel for error / empty / no-results messages. */
export function StatePanel({ title, text, actionLabel, onAction, role }: PanelProps) {
  return (
    <div className="pm-state" role={role}>
      <h2 className="pm-state-title">{title}</h2>
      <p className="pm-state-text">{text}</p>
      {actionLabel && onAction && (
        <button type="button" className="pm-btn pm-btn-outline" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
