import { api } from "@/lib/api";
import { GameGalleryCarousel } from "./game-gallery-carousel";
import { GalleryGrid } from "./gallery-grid";
import type { GalleryImageDto } from "./gallery-section";
import "./gallery.css";

const seasonTwoGallery: GalleryImageDto[] = [
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-cricket-champions.jpg",
    alt: "GM Infinite celebrating their Cricket result",
    category: "Cricket",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-cricket-hercules.jpg",
    alt: "Hercules on EPL Cricket match day",
    category: "Cricket",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-cricket-runners-up.jpg",
    alt: "SNN Raj Serenity Cricket runners-up",
    category: "Cricket",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-badminton-champions.jpg",
    alt: "EPL Season 2 Badminton champions",
    category: "Badminton",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-badminton-sriram.jpg",
    alt: "Sriram Summit Badminton team",
    category: "Badminton",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-badminton-winners.jpg",
    alt: "SNN Raj Serenity Badminton winners",
    category: "Badminton",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-volleyball-champions.jpg",
    alt: "GM Infinite Volleyball champions",
    category: "Volleyball",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-volleyball-sriram.jpg",
    alt: "Sriram Summit Volleyball team",
    category: "Volleyball",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-volleyball-runners-up.jpg",
    alt: "Sriram Summit Volleyball runners-up",
    category: "Volleyball",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-volleyball-match-day.jpg",
    alt: "EPL Volleyball match-day action",
    category: "Volleyball",
  },
  {
    url: "https://steplmediacontent.blob.core.windows.net/season2/result/season2-gallery-prize-ceremony.jpg",
    alt: "EPL Season 2 overall championship prize ceremony",
    category: "Ceremony",
  },
];

interface GalleryResponse {
  items: GalleryImageDto[];
  total: number;
  generatedAt: string;
}

const gameSports = ["Cricket", "Badminton", "Volleyball"] as const;

export async function ResultsGallery() {
  const response = await api.get<GalleryResponse>("/api/gallery/season2-games");
  const gamePhotos = response.ok ? response.data.items : [];
  const galleries = gameSports
    .map((sport) => ({
      sport,
      items: gamePhotos.filter((item) => item.category?.toLowerCase() === sport.toLowerCase()),
    }))
    .filter((gallery) => gallery.items.length > 0);

  return (
    <section className="gallery" aria-labelledby="results-gallery-title" id="gallery">
      <header className="galleryHeader">
        <div>
          <span className="galleryEyebrow">Season 2 · The moments</span>
          <h2 className="galleryTitle" id="results-gallery-title">Photo Gallery</h2>
        </div>
        <p className="galleryLead">
          From the first serve to the final celebration—relive the teams, titles and moments
          that made <strong>EPL Season 2</strong> unforgettable.
        </p>
      </header>

      <GalleryGrid items={seasonTwoGallery} />

      {galleries.length > 0 && (
        <div className="gameGalleries" aria-labelledby="game-galleries-title">
          <header className="gameGalleriesHeader">
            <span className="galleryEyebrow">From every field and court</span>
            <h2 className="gameGalleriesTitle" id="game-galleries-title">Game Day Galleries</h2>
            <p>
              Explore every match-day moment from Cricket, Badminton and Volleyball.
              The galleries update automatically as new Season 2 photos arrive.
            </p>
          </header>

          <div className="gameGalleriesList">
            {galleries.map((gallery) => (
              <GameGalleryCarousel key={gallery.sport} sport={gallery.sport} items={gallery.items} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
