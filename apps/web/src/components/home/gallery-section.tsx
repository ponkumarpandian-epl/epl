import { api } from "@/lib/api";
import { GalleryGrid } from "./gallery-grid";
import "./gallery.css";

export interface GalleryImageDto {
  url:      string;
  alt:      string;
  width?:   number;
  height?:  number;
  category?: string;
}
interface GalleryResponse {
  items:       GalleryImageDto[];
  total:       number;
  generatedAt: string;
}

export async function GallerySection() {
  const res = await api.get<GalleryResponse>("/api/gallery");

  if (!res.ok || res.data.items.length === 0) {
    return null;
  }

  return (
    <section className="gallery" aria-label="Tournament gallery" id="gallery">
      <header className="galleryHeader">
        <div>
          <span className="galleryEyebrow">Season 2 · Highlights</span>
          <h2 className="galleryTitle">Gallery</h2>
        </div>
        <p className="galleryLead">
          A look at the moments that made <strong>EPL Season 1</strong> unforgettable.
          More from this season as we go.
        </p>
      </header>

      <GalleryGrid items={res.data.items} />
    </section>
  );
}
