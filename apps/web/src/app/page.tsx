import type { Metadata } from "next";
import { ResultsHome } from "@/components/home/results-home";
import { ResultsGallery } from "@/components/home/results-gallery";
import { SponsorsCta } from "@/components/home/sponsors-cta";

export const metadata: Metadata = {
  title: "Season 2 Official Results",
  description:
    "EPL Season 2 official results: GM Infinite E-City Town are the 2026 overall champions after Cricket, Badminton and Volleyball.",
  openGraph: {
    title: "The Season Is Settled · EPL Season 2 Results",
    description:
      "GM Infinite E-City Town are the EPL Season 2 overall champions. Explore the final podium and complete standings.",
    images: [
      {
        url: "https://steplmediacontent.blob.core.windows.net/season2/result/EPL_Champions_Collage.jpg",
        alt: "GM Infinite E-City Town — EPL Season 2 overall champions",
      },
    ],
  },
};

export default function HomePage() {
  return (
    <>
      <ResultsHome />
      <ResultsGallery />
      <SponsorsCta />
    </>
  );
}
