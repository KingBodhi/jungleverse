"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDERS } from "@/lib/constants";

interface ProviderSummary {
  provider: string;
  nickname: string | null;
  balance: number;
  depositTolerance: number;
  effectiveBalance: number;
  currency: string;
  sessionCount: number;
  profit: number;
}

interface BankrollSummary {
  totalBalance: number;
  totalDepositTolerance: number;
  effectiveBankroll: number;
  totalProfit: number;
  cashProfit: number;
  tournamentProfit: number;
  accountCount: number;
  byProvider: ProviderSummary[];
  stats: {
    totalSessions: number;
    winRate: number;
    avgSessionProfit: number;
  };
}

function formatCurrency(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getProviderLabel(provider: string) {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}

function getProviderColor(provider: string) {
  return PROVIDERS.find((p) => p.value === provider)?.color ?? "#6b7280";
}

export function BankrollOverview() {
  const [summary, setSummary] = useState<BankrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/bankroll/summary");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSummary(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bankroll");
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bankroll Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bankroll Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {error || "No bankroll data available. Add an account to get started."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bankroll</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(summary.totalBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(summary.totalDepositTolerance)} deposit tolerance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Effective Bankroll</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(summary.effectiveBankroll)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Available for play across {summary.accountCount} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Profit/Loss</CardDescription>
            <CardTitle className={`text-2xl ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.totalProfit >= 0 ? "+" : ""}{formatCurrency(summary.totalProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {summary.stats.totalSessions} sessions · {summary.stats.winRate.toFixed(1)}% win rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By provider breakdown */}
      {summary.byProvider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By Account</CardTitle>
            <CardDescription>Balance breakdown by poker site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.byProvider.map((account) => (
                <div
                  key={account.provider}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getProviderColor(account.provider) }}
                    />
                    <div>
                      <p className="font-medium">
                        {account.nickname || getProviderLabel(account.provider)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.sessionCount} sessions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                    <p className={`text-xs ${account.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {account.profit >= 0 ? "+" : ""}{formatCurrency(account.profit, account.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profit by game type */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cash Game Profit</CardDescription>
            <CardTitle className={summary.cashProfit >= 0 ? "text-green-600" : "text-red-600"}>
              {summary.cashProfit >= 0 ? "+" : ""}{formatCurrency(summary.cashProfit)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tournament Profit</CardDescription>
            <CardTitle className={summary.tournamentProfit >= 0 ? "text-green-600" : "text-red-600"}>
              {summary.tournamentProfit >= 0 ? "+" : ""}{formatCurrency(summary.tournamentProfit)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
