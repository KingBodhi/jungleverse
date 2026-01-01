export interface FetchLog {
  provider: string;
  timestamp: Date;
  success: boolean;
  dataType: 'tournaments' | 'cashGames' | 'both';
  recordCount?: number;
  error?: string;
  duration?: number;
}

export class ProviderLogger {
  private logs: FetchLog[] = [];
  private readonly maxLogs: number;

  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs;
  }

  /**
   * Log a successful fetch
   */
  logSuccess(
    provider: string,
    dataType: 'tournaments' | 'cashGames' | 'both',
    recordCount: number,
    duration?: number
  ): void {
    this.addLog({
      provider,
      timestamp: new Date(),
      success: true,
      dataType,
      recordCount,
      duration
    });
  }

  /**
   * Log a failed fetch
   */
  logError(
    provider: string,
    dataType: 'tournaments' | 'cashGames' | 'both',
    error: Error | string,
    duration?: number
  ): void {
    this.addLog({
      provider,
      timestamp: new Date(),
      success: false,
      dataType,
      error: error instanceof Error ? error.message : error,
      duration
    });
  }

  /**
   * Add log entry
   */
  private addLog(log: FetchLog): void {
    this.logs.push(log);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    if (log.success) {
      console.log(
        `[Provider] ${log.provider} ✓ ${log.dataType} - ${log.recordCount} records` +
        (log.duration ? ` (${log.duration}ms)` : '')
      );
    } else {
      console.error(
        `[Provider] ${log.provider} ✗ ${log.dataType} - ${log.error}` +
        (log.duration ? ` (${log.duration}ms)` : '')
      );
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): FetchLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs for a specific provider
   */
  getProviderLogs(provider: string, count: number = 50): FetchLog[] {
    return this.logs
      .filter(log => log.provider.toLowerCase() === provider.toLowerCase())
      .slice(-count);
  }

  /**
   * Get failed fetches
   */
  getErrors(count: number = 50): FetchLog[] {
    return this.logs
      .filter(log => !log.success)
      .slice(-count);
  }

  /**
   * Get provider statistics
   */
  getProviderStats(provider: string): {
    totalFetches: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    lastFetch?: FetchLog;
    avgDuration?: number;
  } {
    const providerLogs = this.logs.filter(
      log => log.provider.toLowerCase() === provider.toLowerCase()
    );

    const successCount = providerLogs.filter(log => log.success).length;
    const errorCount = providerLogs.filter(log => !log.success).length;
    const totalFetches = providerLogs.length;

    const durations = providerLogs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : undefined;

    return {
      totalFetches,
      successCount,
      errorCount,
      successRate: totalFetches > 0 ? successCount / totalFetches : 0,
      lastFetch: providerLogs[providerLogs.length - 1],
      avgDuration
    };
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get summary of all providers
   */
  getAllProviderStats(): Record<string, ReturnType<typeof this.getProviderStats>> {
    const providers = [...new Set(this.logs.map(log => log.provider))];
    const stats: Record<string, ReturnType<typeof this.getProviderStats>> = {};

    for (const provider of providers) {
      stats[provider] = this.getProviderStats(provider);
    }

    return stats;
  }
}

export const providerLogger = new ProviderLogger();
