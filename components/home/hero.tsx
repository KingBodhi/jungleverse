import { Button } from "@/components/ui/button";
import { GlobalSearchBar } from "@/components/search/global-search-bar";

export function Hero() {
  return (
    <div className="container py-16">
      <div className="space-y-8">
        <div className="poker-table-shell">
          <div className="poker-table-rim">
            <div className="poker-table-felt">
              <p className="text-center text-4xl font-display tracking-[0.06em] text-white">
                Global Poker Intelligence
              </p>
              <div className="mt-8 px-10">
                <GlobalSearchBar />
              </div>
              <p className="mt-4 text-center text-sm text-white/80">
                We index every reputable poker room, tournament, and cash lineup around the globe so you can plan the next
                move with confidence.
              </p>
            </div>
          </div>
        </div>
        <div className="poker-console">
          <Button asChild size="lg" className="poker-action poker-action--bet">
            <a href="/dashboard">Personalize my lineup</a>
          </Button>
          <Button asChild size="lg" variant="ghost" className="poker-action poker-action--tour">
            <a href="#tour">Take the tour</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
