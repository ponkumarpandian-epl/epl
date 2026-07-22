"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GalleryImageDto } from "./gallery-section";
import { GalleryLightbox } from "./gallery-grid";

const AUTOPLAY_INTERVAL_MS = 5_000;
const SWIPE_THRESHOLD_PX = 45;

interface GameGalleryCarouselProps {
  sport: string;
  items: GalleryImageDto[];
}

export function GameGalleryCarousel({ sport, items }: GameGalleryCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [inViewport, setInViewport] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  const count = items.length;
  const previousIndex = (index - 1 + count) % count;
  const nextIndex = (index + 1) % count;

  const previous = useCallback(() => {
    setIndex((current) => (current - 1 + count) % count);
  }, [count]);

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % count);
  }, [count]);

  const autoplayNext = useCallback(() => {
    setIndex((current) => (current + 1) % count);
  }, [count]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const fallback = window.setTimeout(() => setInViewport(true), 0);
      return () => window.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const canAutoplay =
    count > 1 && inViewport && pageVisible && !reducedMotion && !hovered && !focused && !lightboxOpen;

  useEffect(() => {
    if (!canAutoplay) return;
    const timer = window.setInterval(autoplayNext, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoplayNext, canAutoplay, index]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && count > 1) previous();
      if (event.key === "ArrowRight" && count > 1) next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [count, lightboxOpen, next, previous]);

  const visibleIndexes = useMemo(() => {
    if (count <= 1) return [0];
    return [...new Set([previousIndex, index, nextIndex])];
  }, [count, index, nextIndex, previousIndex]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < SWIPE_THRESHOLD_PX || count < 2) return;
    if (distance < 0) next();
    else previous();
  };

  const active = items[index];
  const sportClass = sport.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <article
      ref={rootRef}
      className={`gameCarousel gameCarousel--${sportClass}`}
      aria-labelledby={`game-gallery-${sportClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <header className="gameCarouselHeader">
        <div>
          <span className="gameCarouselKicker">Season 2 · Match day</span>
          <h3 className="gameCarouselTitle" id={`game-gallery-${sportClass}`}>{sport}</h3>
        </div>
        <span className="gameCarouselCount" aria-label={`${count} photos`}>
          {String(index + 1).padStart(2, "0")} <i aria-hidden="true" /> {String(count).padStart(2, "0")}
        </span>
      </header>

      <div className="gameCarouselFrame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="gameCarouselTrack">
          {visibleIndexes.map((itemIndex) => {
            const item = items[itemIndex];
            const position = itemIndex === index
              ? "current"
              : itemIndex === previousIndex
                ? "previous"
                : "next";

            return (
              <button
                type="button"
                className={`gameCarouselSlide gameCarouselSlide--${position}`}
                key={`${item.url}-${itemIndex}`}
                onClick={() => {
                  if (itemIndex !== index) setIndex(itemIndex);
                  else setLightboxOpen(true);
                }}
                aria-label={itemIndex === index ? `Open image: ${item.alt}` : `Show ${position} image`}
                aria-hidden={itemIndex !== index}
                tabIndex={itemIndex === index ? 0 : -1}
              >
                <Image
                  src={item.url}
                  alt={itemIndex === index ? item.alt : ""}
                  fill
                  sizes="(max-width: 760px) 92vw, (max-width: 1180px) 80vw, 1100px"
                  className="gameCarouselImage"
                />
              </button>
            );
          })}
          <div className="gameCarouselVignette" aria-hidden="true" />
          <span className="gameCarouselCaption">{active.alt}</span>
        </div>

        {count > 1 && (
          <div className="gameCarouselControls">
            <button type="button" onClick={previous} aria-label={`Previous ${sport} photo`}>
              <ArrowIcon direction="left" />
            </button>
            <div className="gameCarouselProgress" aria-hidden="true">
              <span style={{ width: `${((index + 1) / count) * 100}%` }} />
            </div>
            <button type="button" onClick={next} aria-label={`Next ${sport} photo`}>
              <ArrowIcon direction="right" />
            </button>
          </div>
        )}
      </div>

      {lightboxOpen && createPortal(
        <GalleryLightbox
          item={active}
          onClose={() => setLightboxOpen(false)}
          onPrev={previous}
          onNext={next}
          position={`${index + 1} / ${count}`}
          hideNavigation={count === 1}
        />,
        document.body,
      )}
    </article>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
