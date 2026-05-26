import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { CommunityFab } from "./community-fab";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col safe-pad-x">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CommunityFab />
    </div>
  );
}
