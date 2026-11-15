import { useMemo } from "react";
import { formatPhotoCount, type AlbumSummary } from "../lib/albums";
import { PencilIcon } from "./icons";

interface AlbumCardProps {
  album: AlbumSummary;
}

const MOSAIC_SLOTS = 4;

export default function AlbumCard({ album }: AlbumCardProps) {
  // The design shows a fixed 2x2 mosaic; missing photos render as neutral placeholder tiles.
  const slots = useMemo(
    () => Array.from({ length: MOSAIC_SLOTS }, (_, i) => album.images[i] ?? null),
    [album.images],
  );

  return (
    <article className="pm-card">
      <div className="pm-mosaic" aria-hidden="true">
        {slots.map((src, i) =>
          src ? (
            <img key={i} src={src} alt="" loading="lazy" />
          ) : (
            <span key={i} className="pm-mosaic-empty" />
          ),
        )}
      </div>
      <div className="pm-card-footer">
        <div className="pm-card-text">
          <h2 className="pm-card-title">{album.name}</h2>
          {/* The API provides no usable "updated" date, so the design's "· atualizado a ..." is omitted. */}
          <p className="pm-card-meta">{formatPhotoCount(album.images.length)}</p>
        </div>
        {/* Placeholder: album editing is not implemented (Editar álbum is out of scope). */}
        <button
          type="button"
          className="pm-icon-btn d-none d-lg-inline-flex"
          aria-disabled="true"
          aria-label={`Editar álbum ${album.name}`}
          title="Brevemente"
          onClick={(e) => e.preventDefault()}
        >
          <PencilIcon size={16} />
        </button>
      </div>
    </article>
  );
}
