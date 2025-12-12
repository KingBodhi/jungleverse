import { Button } from "@/components/ui/button";
import { GlobalSearchBar } from "@/components/search/global-search-bar";

export function Hero() {
  return (
    <div className="container flex flex-col gap-8 py-16 text-center">
      <span className="text-sm uppercase tracking-[0.2em] text-primary">Global Poker Intelligence</span>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        The Global Texas Hold&rsquo;em Game Index
      </h1>
      <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
        Discover every reputable poker room, recurring tournament, and cash game around the world. Dial in your
        bankroll, schedule, and travel radius to get an instant game plan.
      </p>
      <div className="flex flex-col items-center gap-4">
        <GlobalSearchBar />
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>Featured: Las Vegas</span>
          <span>·</span>
          <span>Texas</span>
          <span>·</span>
          <span>Europe</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <a href="/dashboard">Personalize my lineup</a>
        </Button>
        <Button variant="ghost" size="lg" asChild>
          <a href="#tour">Take the tour</a>
        </Button>
      </div>
    </div>
  );
}
