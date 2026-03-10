/**
 * Pulse Feed Service — fetches poker news from Pulse Engine API
 * and optionally subscribes to NATS for real-time updates.
 */

const PULSE_API_URL = process.env.PULSE_API_URL || "http://localhost:8080";

export interface PulseContentItem {
  id: number;
  content_hash: string;
  source_id: string;
  source_type: string;
  url: string;
  title: string;
  body: string | null;
  author: string | null;
  published_at: string | null;
  collected_at: string;
  summary: string | null;
  relevance_score: number | null;
  project: string;
}

export interface PulseAlert {
  item: PulseContentItem;
  alert: {
    rule_id: string;
    priority: string;
    triggered_at: string;
  };
}

/**
 * Fetch latest content from Pulse Engine API.
 */
export async function fetchLatestContent(
  limit: number = 20,
  project: string = "poker-pulse"
): Promise<PulseContentItem[]> {
  try {
    const url = `${PULSE_API_URL}/api/v1/content/latest?project=${project}&limit=${limit}`;
    const res = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 60 seconds in Next.js
    });

    if (!res.ok) {
      console.error(`Pulse API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch from Pulse API:", error);
    return [];
  }
}

/**
 * Search content from Pulse Engine API.
 */
export async function searchContent(
  keyword: string,
  options: {
    limit?: number;
    project?: string;
    source_id?: string;
    since?: string;
  } = {}
): Promise<PulseContentItem[]> {
  try {
    const params = new URLSearchParams({
      keyword,
      limit: String(options.limit || 50),
    });
    if (options.project) params.set("project", options.project);
    if (options.source_id) params.set("source_id", options.source_id);
    if (options.since) params.set("since", options.since);

    const url = `${PULSE_API_URL}/api/v1/content?${params}`;
    const res = await fetch(url, {
      next: { revalidate: 30 },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to search Pulse API:", error);
    return [];
  }
}

/**
 * Fetch Pulse Engine health status.
 */
export async function fetchPulseHealth(): Promise<{
  status: string;
  projects?: number;
} | null> {
  try {
    const res = await fetch(`${PULSE_API_URL}/ready`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
