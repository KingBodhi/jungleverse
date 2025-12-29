"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDERS } from "@/lib/constants";
import { GameSession, BankrollAccount } from "@prisma/client";

type SessionWithAccount = GameSession & {
  bankrollAccount: Pick<BankrollAccount, "provider" | "nickname" | "currency">;
};

function formatCurrency(cents: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getProviderLabel(provider: string) {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}

interface Props {
  limit?: number;
}

export function SessionsList({ limit = 10 }: Props) {
  const [sessions, setSessions] = useState<SessionWithAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch(`/api/bankroll/sessions?limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setSessions(data.data || []);
        }
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>No sessions logged yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the &quot;Log Session&quot; button to record your first session.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
        <CardDescription>Your last {sessions.length} poker sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {session.stakesDescription || session.sessionType}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted">
                    {session.variant}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {session.venueName ||
                    session.bankrollAccount.nickname ||
                    getProviderLabel(session.bankrollAccount.provider)}{" "}
                  · {formatDate(session.startedAt)}
                  {session.durationMinutes && (
                    <> · {Math.floor(session.durationMinutes / 60)}h {session.durationMinutes % 60}m</>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${session.result >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {session.result >= 0 ? "+" : ""}
                  {formatCurrency(session.result, session.bankrollAccount.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(session.buyIn, session.bankrollAccount.currency)} →{" "}
                  {formatCurrency(session.cashOut, session.bankrollAccount.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
