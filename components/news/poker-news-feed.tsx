"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsItem {
  id: string;
  contentHash: string;
  sourceId: string;
  sourceType: string;
  url: string;
  title: string;
  body: string | null;
  author: string | null;
  publishedAt: string | null;
  collectedAt: string;
  summary: string | null;
  isAlert: boolean;
  alertRuleId: string | null;
}

const SOURCE_COLORS: Record<string, string> = {
  cardplayer: "bg-blue-500",
  pokernews: "bg-red-500",
  pokerorg: "bg-green-500",
  pokerfuse: "bg-purple-500",
  flushdraw: "bg-orange-500",
  "reddit-poker": "bg-orange-600",
  "reddit-pokerstars": "bg-orange-600",
  "ggpoker-blog": "bg-yellow-500",
  "pokerstars-blog": "bg-red-600",
  "wpt-news": "bg-indigo-500",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function PokerNewsFeed({
  limit = 20,
  showAlerts = true,
}: {
  limit?: number;
  showAlerts?: boolean;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "alerts">("all");

  useEffect(() => {
    async function fetchNews() {
      try {
        const action = filter === "alerts" ? "alerts" : "latest";
        const res = await fetch(`/api/pulse?action=${action}&limit=${limit}`);
        if (res.ok) {
          const json = await res.json();
          setItems(json.data?.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, [limit, filter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg font-semibold">Poker News</CardTitle>
        {showAlerts && (
          <div className="flex gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("alerts")}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === "alerts"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Alerts
            </button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No news items available yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium leading-tight line-clamp-2">
                    {item.isAlert && (
                      <Badge variant="destructive" className="mr-1.5 text-[10px]">
                        ALERT
                      </Badge>
                    )}
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                    {timeAgo(item.collectedAt)}
                  </span>
                </div>

                {item.body && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.summary || item.body}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] text-white ${
                      SOURCE_COLORS[item.sourceId] || "bg-gray-500"
                    }`}
                  >
                    {item.sourceId}
                  </Badge>
                  {item.author && (
                    <span className="text-[10px] text-muted-foreground">
                      by {item.author}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
