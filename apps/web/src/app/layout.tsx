import type { Metadata, Viewport } from "next";
import { Anton, Inter, JetBrains_Mono, Oswald } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.e-citypremierleague.in"),
  title: {
    default: "Electronic-City Premier League · Season 2 (2026)",
    template: "%s · EPL",
  },
  description:
    "EPL Season 2 (2026) — Cricket, Badminton & Volleyball inter-apartment tournament in Electronic City, Bengaluru. Register your team today.",
  applicationName: "EPL Season 2",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Electronic-City Premier League · Season 2 (2026)",
    description:
      "Cricket, Badminton & Volleyball inter-apartment tournament in Electronic City, Bengaluru.",
    images: ["/epl_logo.jpg"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#03081A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${anton.variable} ${oswald.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <a href="#main" className="skip-to-main">Skip to content</a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
