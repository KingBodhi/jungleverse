import { NextRequest } from "next/server";
import { ok, error } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pulse — Proxy + cache for Pulse Engine poker news
 *
 * Query params:
 *   action: "latest" | "alerts" | "search"
 *   limit: number (default 20)
 *   keyword: string (for search)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "latest";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  try {
    if (action === "latest") {
      const items = await prisma.pokerNews.findMany({
        orderBy: { collectedAt: "desc" },
        take: limit,
      });
      return ok({ items, count: items.length });
    }

    if (action === "alerts") {
      const items = await prisma.pokerNews.findMany({
        where: { isAlert: true },
        orderBy: { collectedAt: "desc" },
        take: limit,
      });
      return ok({ items, count: items.length });
    }

    if (action === "search") {
      const keyword = searchParams.get("keyword");
      if (!keyword) {
        return error("keyword parameter required for search", 400);
      }

      const items = await prisma.pokerNews.findMany({
        where: {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { body: { contains: keyword, mode: "insensitive" } },
          ],
        },
        orderBy: { collectedAt: "desc" },
        take: limit,
      });
      return ok({ items, count: items.length });
    }

    return error(`Unknown action: ${action}`, 400);
  } catch (err) {
    console.error("Pulse API error:", err);
    return error("Internal server error", 500);
  }
}
