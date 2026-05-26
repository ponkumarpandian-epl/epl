"use client";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { GalleryImageDto } from "./gallery-section";
import "./gallery.css";

export function GalleryGrid({ items }: { items: GalleryImageDto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open  = index !== null;
  const close = useCallback(() => setIndex(null), []);
  const prev  = useCallback(() => setIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length)), [items.length]);
  const next  = useCallback(() => setIndex((i) => (i === null ? null : (i + 1) % items.length)), [items.length]);

  // Keyboard nav + scroll lock when lightbox is open
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     close();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  const active = open ? items[index!] : null;

  return (
    <>
      <ul className="galleryGrid" role="list">
        {items.map((img, i) => (
          <li
            key={`${img.url}-${i}`}
            className={`galleryItem ${categoryClass(img.category)}`}
            style={spanFor(i)}
          >
            <button
              type="button"
              className="galleryTile"
              onClick={() => setIndex(i)}
              aria-label={`Open image: ${img.alt}`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                sizes="(max-width: 540px) 100vw, (max-width: 1080px) 50vw, 33vw"
                className="galleryImage"
                priority={i === 0}
              />
              {img.category && (
                <span className="galleryTag" aria-hidden="true">{img.category}</span>
              )}
              <span className="galleryShine" aria-hidden="true" />
              <span className="galleryHoverOverlay" aria-hidden="true">
                <span className="galleryHoverText">{img.alt}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && active && (
        <Lightbox
          item={active}
          onClose={close}
          onPrev={prev}
          onNext={next}
          position={`${index! + 1} / ${items.length}`}
        />
      )}
    </>
  );
}

function categoryClass(category?: string): string {
  switch (category?.toLowerCase()) {
    case "cricket":    return "cat-cricket";
    case "badminton":  return "cat-badminton";
    case "volleyball": return "cat-volleyball";
    default:           return "cat-highlights";
  }
}

/** Bento layout — explicit per-position spans. 8-item rhythm. */
function spanFor(index: number): React.CSSProperties {
  const i = index % 8;
  switch (i) {
    case 0:  return { gridColumn: "span 2", gridRow: "span 2" }; // big hero tile
    case 3:  return { gridColumn: "span 2" };                    // wide row
    default: return {};
  }
}

function Lightbox({
  item, onClose, onPrev, onNext, position,
}: {
  item: GalleryImageDto;
  onClose: () => void;
  onPrev:  () => void;
  onNext:  () => void;
  position: string;
}) {
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={item.alt} onClick={onClose}>
      <button type="button" className="lightboxBtn lightboxClose" onClick={onClose} aria-label="Close">×</button>

      <button type="button" className="lightboxBtn lightboxNav lightboxNavPrev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous image">‹</button>
      <button type="button" className="lightboxBtn lightboxNav lightboxNavNext" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next image">›</button>

      <figure className="lightboxFigure" onClick={(e) => e.stopPropagation()}>
        <div className="lightboxImageWrap">
          <Image
            src={item.url}
            alt={item.alt}
            fill
            sizes="(max-width: 760px) 92vw, 80vw"
            className="lightboxImage"
            priority
          />
        </div>
        <figcaption className="lightboxCaption">
          <span className="lightboxAlt">{item.alt}</span>
          <span className="lightboxMeta">
            {item.category && <span className="lightboxBadge">{item.category}</span>}
            <span className="lightboxPosition">{position}</span>
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
