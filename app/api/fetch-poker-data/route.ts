// app/api/fetch-poker-data/route.ts

import { fetchAllPokerData } from "@/lib/poker-data-fetcher";
import { providerMonitor } from "@/lib/providers/monitor";
import { providerLogger } from "@/lib/providers/logger";
import { providerCache } from "@/lib/providers/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") ?? undefined;
  const action = searchParams.get("action") ?? "fetch";

  try {
    // Handle different actions
    switch (action) {
      case "status":
        return handleStatus();

      case "health":
        return handleHealth();

      case "stats":
        return handleStats(provider);

      case "validate":
        if (!provider) {
          return NextResponse.json(
            { error: "Provider name required for validation" },
            { status: 400 }
          );
        }
        return await handleValidate(provider);

      case "clear-cache":
        return handleClearCache(provider);

      case "fetch":
      default:
        return await handleFetch(provider);
    }
  } catch (error) {
    console.error("API request failed:", error);
    return NextResponse.json(
      {
        error: "Request failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function handleFetch(provider?: string) {
  const startTime = Date.now();

  try {
    await fetchAllPokerData(provider);
    const duration = Date.now() - startTime;
    const scope = provider ? `provider:${provider}` : "all-providers";

    return NextResponse.json({
      success: true,
      message: `Data fetching completed successfully (${scope})`,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching poker data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Data fetching failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function handleStatus() {
  const report = providerMonitor.generateReport();

  return NextResponse.json({
    summary: report.summary,
    health: report.health,
    recommendations: report.recommendations,
    timestamp: new Date().toISOString(),
  });
}

function handleHealth() {
  const health = providerMonitor.getSystemHealth();

  return NextResponse.json({
    status: health.overall,
    providers: health.providers,
    cache: health.cacheStats,
    timestamp: health.timestamp,
  });
}

function handleStats(provider?: string) {
  if (provider) {
    const stats = providerLogger.getProviderStats(provider);
    const health = providerMonitor.getProviderHealth(provider);

    return NextResponse.json({
      provider,
      statistics: stats,
      health,
      timestamp: new Date().toISOString(),
    });
  }

  const allStats = providerLogger.getAllProviderStats();

  return NextResponse.json({
    providers: allStats,
    recentErrors: providerLogger.getErrors(10),
    timestamp: new Date().toISOString(),
  });
}

async function handleValidate(provider: string) {
  const validation = await providerMonitor.validateProviderData(provider);

  return NextResponse.json({
    provider,
    valid: validation.valid,
    issues: validation.issues,
    timestamp: new Date().toISOString(),
  });
}

function handleClearCache(provider?: string) {
  if (provider) {
    providerMonitor.clearProviderCache(provider);
    return NextResponse.json({
      success: true,
      message: `Cache cleared for ${provider}`,
      timestamp: new Date().toISOString(),
    });
  }

  providerCache.clear();
  return NextResponse.json({
    success: true,
    message: "All cache cleared",
    timestamp: new Date().toISOString(),
  });
}
