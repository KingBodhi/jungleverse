import { providerLogger } from "./logger";
import { providerCache } from "./cache";
import { providerRegistry } from "./index";

export interface ProviderHealthCheck {
  provider: string;
  status: "healthy" | "degraded" | "down";
  lastSuccessfulFetch?: Date;
  lastError?: string;
  successRate: number;
  avgResponseTime?: number;
  cacheHitRate?: number;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "down";
  providers: ProviderHealthCheck[];
  cacheStats: {
    size: number;
    expired: number;
  };
  timestamp: Date;
}

export class ProviderMonitor {
  /**
   * Get health status for a specific provider
   */
  getProviderHealth(providerName: string): ProviderHealthCheck {
    const stats = providerLogger.getProviderStats(providerName);

    let status: "healthy" | "degraded" | "down" = "healthy";
    if (stats.totalFetches === 0) {
      status = "down";
    } else if (stats.successRate < 0.5) {
      status = "down";
    } else if (stats.successRate < 0.8) {
      status = "degraded";
    }

    return {
      provider: providerName,
      status,
      lastSuccessfulFetch: stats.lastFetch?.success ? stats.lastFetch.timestamp : undefined,
      lastError: stats.lastFetch?.success === false ? stats.lastFetch.error : undefined,
      successRate: stats.successRate,
      avgResponseTime: stats.avgDuration,
    };
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): SystemHealth {
    const providers = providerRegistry.map((connector) =>
      this.getProviderHealth(connector.name)
    );

    // Calculate overall status
    const downCount = providers.filter((p) => p.status === "down").length;
    const degradedCount = providers.filter((p) => p.status === "degraded").length;

    let overall: "healthy" | "degraded" | "down" = "healthy";
    if (downCount > providers.length / 2) {
      overall = "down";
    } else if (downCount > 0 || degradedCount > providers.length / 3) {
      overall = "degraded";
    }

    return {
      overall,
      providers,
      cacheStats: providerCache.getStats(),
      timestamp: new Date(),
    };
  }

  /**
   * Get detailed provider statistics
   */
  getProviderStats() {
    return providerLogger.getAllProviderStats();
  }

  /**
   * Get recent errors across all providers
   */
  getRecentErrors(count: number = 20) {
    return providerLogger.getErrors(count);
  }

  /**
   * Validate provider data quality
   */
  async validateProviderData(providerName: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      const connector = providerRegistry.find(
        (c) => c.name.toLowerCase() === providerName.toLowerCase()
      );

      if (!connector) {
        return {
          valid: false,
          issues: ["Provider not found in registry"],
        };
      }

      // Test fetch without caching
      if (connector.fetchTournaments) {
        const tournaments = await connector.fetchTournaments();

        if (tournaments.length === 0) {
          issues.push("No tournaments returned");
        }

        // Validate tournament data
        for (const t of tournaments.slice(0, 5)) {
          if (!t.pokerRoom) issues.push("Missing pokerRoom field");
          if (!t.variant) issues.push("Missing variant field");
          if (!t.startTime) issues.push("Missing startTime field");
          if (t.buyinAmount === undefined || t.buyinAmount < 0) {
            issues.push("Invalid buyinAmount");
          }
          if (t.startTime && t.startTime < new Date(Date.now() - 86400000)) {
            issues.push("Tournament in the past (>24h)");
          }
        }
      }

      if (connector.fetchCashGames) {
        const cashGames = await connector.fetchCashGames();

        if (cashGames.length === 0) {
          issues.push("No cash games returned");
        }

        // Validate cash game data
        for (const g of cashGames.slice(0, 5)) {
          if (!g.pokerRoom) issues.push("Missing pokerRoom field");
          if (!g.variant) issues.push("Missing variant field");
          if (g.smallBlind <= 0 || g.bigBlind <= 0) {
            issues.push("Invalid blinds");
          }
          if (g.minBuyin <= 0 || g.maxBuyin <= 0) {
            issues.push("Invalid buy-in range");
          }
          if (g.minBuyin > g.maxBuyin) {
            issues.push("Min buy-in exceeds max buy-in");
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Validation error: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Clear cache for a specific provider
   */
  clearProviderCache(providerName: string): void {
    const keys = ["tournaments", "cashGames"];
    for (const key of keys) {
      providerCache.delete(`${providerName}:${key}:latest`);
    }
  }

  /**
   * Generate monitoring report
   */
  generateReport(): {
    summary: string;
    health: SystemHealth;
    recommendations: string[];
  } {
    const health = this.getSystemHealth();
    const stats = this.getProviderStats();
    const recommendations: string[] = [];

    // Analyze each provider
    for (const provider of health.providers) {
      if (provider.status === "down") {
        recommendations.push(
          `⚠️ ${provider.provider} is down. Last error: ${provider.lastError || "Unknown"}`
        );
      } else if (provider.status === "degraded") {
        recommendations.push(
          `⚠️ ${provider.provider} is degraded (success rate: ${(provider.successRate * 100).toFixed(1)}%)`
        );
      }

      if (provider.avgResponseTime && provider.avgResponseTime > 5000) {
        recommendations.push(
          `⏱️ ${provider.provider} has slow response times (avg: ${provider.avgResponseTime}ms)`
        );
      }
    }

    // Cache recommendations
    if (health.cacheStats.expired > health.cacheStats.size * 0.3) {
      recommendations.push(
        `🗄️ High cache expiration rate (${health.cacheStats.expired}/${health.cacheStats.size})`
      );
    }

    const summary = `System: ${health.overall.toUpperCase()} | ` +
      `Providers: ${health.providers.filter((p) => p.status === "healthy").length}/${health.providers.length} healthy | ` +
      `Cache: ${health.cacheStats.size} entries`;

    return {
      summary,
      health,
      recommendations,
    };
  }
}

export const providerMonitor = new ProviderMonitor();
