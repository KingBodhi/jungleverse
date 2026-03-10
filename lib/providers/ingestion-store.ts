import type { ProviderFetchSummary } from "@/lib/poker-data-fetcher";

const HISTORY_CAP = 100;

class ProviderIngestionStore {
  private latest = new Map<string, ProviderFetchSummary>();
  private history: ProviderFetchSummary[] = [];

  update(summary: ProviderFetchSummary) {
    this.latest.set(summary.provider, summary);
    this.history.unshift(summary);
    if (this.history.length > HISTORY_CAP) {
      this.history.pop();
    }
  }

  get(provider: string) {
    return this.latest.get(provider);
  }

  getHistory(provider: string, limit = 10) {
    return this.history.filter((entry) => entry.provider === provider).slice(0, limit);
  }

  listLatest() {
    return Array.from(this.latest.values()).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  listHistory(limit = 25) {
    return this.history.slice(0, limit);
  }
}

declare global {
  var providerIngestionStore: ProviderIngestionStore | undefined;
}

export const providerIngestionStore = globalThis.providerIngestionStore ?? new ProviderIngestionStore();

if (process.env.NODE_ENV !== "production") {
  globalThis.providerIngestionStore = providerIngestionStore;
}
