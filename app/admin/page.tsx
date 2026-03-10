import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { providerMonitor } from "@/lib/providers/monitor";
import { providerLogger } from "@/lib/providers/logger";
import { providerRegistry } from "@/lib/providers";
import { providerIngestionStore } from "@/lib/providers/ingestion-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCasinoManagerAction, revokeCasinoManagerAction } from "./actions";

export default async function AdminPage() {
  await requireAdmin();

  const rooms = await prisma.pokerRoom.findMany({
    orderBy: { name: "asc" },
    include: {
      managers: { select: { id: true, name: true, email: true } },
      _count: { select: { games: true, reviews: true } },
    },
  });

  if (!rooms) {
    notFound();
  }

  const systemHealth = providerMonitor.getSystemHealth();
  const providerStats = providerLogger.getAllProviderStats();
  const recentErrors = providerLogger.getErrors(4);
  const ingestionSnapshots = providerIngestionStore.listLatest();
  const recentRuns = providerIngestionStore.listHistory(8);
  const snapshotMap = new Map(ingestionSnapshots.map((snap) => [snap.provider, snap]));
  const providerRows = providerRegistry.map((connector) => {
    const health =
      systemHealth.providers.find((item) => item.provider === connector.name) ?? {
        provider: connector.name,
        status: "down" as const,
        successRate: 0,
      };
    const stats = providerStats[connector.name] ?? {
      totalFetches: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 0,
      lastFetch: undefined,
      avgDuration: undefined,
    };
    const snapshot = snapshotMap.get(connector.name);
    return { connector, health, stats, snapshot };
  });
  const healthyCount = providerRows.filter((row) => row.health.status === "healthy").length;
  const degradedCount = providerRows.filter((row) => row.health.status === "degraded").length;
  const downCount = providerRows.length - healthyCount - degradedCount;
  const lastRun = ingestionSnapshots[0]?.completedAt;

  const totalRooms = rooms.length;
  const managedRooms = rooms.filter((room) => room.managers.length > 0).length;
  const unassignedRooms = totalRooms - managedRooms;

  return (
    <div className="space-y-10">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Physical casinos" value={totalRooms} caption="Synced from providers" />
        <StatCard label="Delegated rooms" value={managedRooms} caption="Casino operators with access" />
        <StatCard label="Unassigned" value={unassignedRooms} caption="Need onboarding" tone="warning" />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Casino accounts</h2>
            <p className="text-sm text-muted-foreground">Invite partners and manage control of their room profile.</p>
          </div>
        </div>
        <div className="grid gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="border-border/80">
              <CardHeader className="flex flex-col gap-2 space-y-0 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {room.name}
                    <Badge variant={room.managers.length ? "default" : "secondary"}>
                      {room.managers.length ? "Delegated" : "Unassigned"}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {room.city}
                    {room.state ? `, ${room.state}` : ""} · {room.country}
                  </p>
                </div>
                <Link href={`/casino/${room.id}`} className="text-sm font-semibold text-primary">
                  Open portal →
                </Link>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current managers</p>
                    {room.managers.length ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {room.managers.map((manager) => (
                          <li key={manager.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                            <div>
                              <p className="font-medium">{manager.name || manager.email}</p>
                              <p className="text-xs text-muted-foreground">{manager.email}</p>
                            </div>
                            <form action={revokeCasinoManagerAction}>
                              <input type="hidden" name="userId" value={manager.id} />
                              <Button variant="ghost" size="sm">
                                Revoke
                              </Button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No delegated access.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invite / update</p>
                    <form action={createCasinoManagerAction} className="mt-2 space-y-3">
                      <input type="hidden" name="roomId" value={room.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`name-${room.id}`}>Contact name</Label>
                        <Input id={`name-${room.id}`} name="name" placeholder="Poker room manager" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`email-${room.id}`}>Email</Label>
                        <Input
                          id={`email-${room.id}`}
                          name="email"
                          type="email"
                          required
                          placeholder="partner@casino.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`password-${room.id}`}>Password</Label>
                        <Input
                          id={`password-${room.id}`}
                          name="password"
                          type="password"
                          minLength={8}
                          placeholder="Temporary password"
                          required={!room.managers.length}
                        />
                        <p className="text-xs text-muted-foreground">
                          {room.managers.length
                            ? "Leave blank to keep the current password."
                            : "Set a temporary password to share with the casino."}
                        </p>
                      </div>
                      <Button type="submit" className="w-full">
                        {room.managers.length ? "Update access" : "Create account"}
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Provider ingestion</h2>
            <p className="text-sm text-muted-foreground">
              Live connector health plus the most recent fetch run summary.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <a href="/api/fetch-poker-data" target="_blank" rel="noreferrer">
                Run fetch
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/api/fetch-poker-data?action=stats" target="_blank" rel="noreferrer">
                View stats JSON
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <IngestionStatCard label="Providers" value={`${healthyCount}/${providerRows.length}`} caption="Healthy" />
          <IngestionStatCard label="Needs attention" value={degradedCount + downCount} caption="Degraded or down" tone="warning" />
          <IngestionStatCard
            label="Last run"
            value={lastRun ? formatDateTime(lastRun) : "Pending"}
            caption={lastRun ? "Latest /api/fetch-poker-data" : "Run the fetch above"}
          />
          <IngestionStatCard
            label="Recent errors"
            value={recentErrors.length}
            caption={recentErrors[0]?.provider ?? "None"}
            tone={recentErrors.length ? "warning" : "default"}
          />
        </div>
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Last fetch</th>
                <th className="px-4 py-3">Last run impact</th>
                <th className="px-4 py-3">Missing rooms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {providerRows.map(({ connector, health, stats, snapshot }) => {
                const successPct = Math.round((health.successRate ?? stats.successRate ?? 0) * 100);
                const lastFetchTime = snapshot?.completedAt ?? stats.lastFetch?.timestamp?.toISOString();
                const createdCount = snapshot
                  ? snapshot.tournaments.created + snapshot.cashGames.created
                  : 0;
                const updatedCount = snapshot
                  ? snapshot.tournaments.updated + snapshot.cashGames.updated
                  : 0;
                return (
                  <tr key={connector.name}>
                    <td className="px-4 py-3 font-medium">{connector.name}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={health.status} />
                    </td>
                    <td className="px-4 py-3">{successPct}%</td>
                    <td className="px-4 py-3">{lastFetchTime ? formatDateTime(lastFetchTime) : "—"}</td>
                    <td className="px-4 py-3">
                      {snapshot ? (
                        <span className="text-muted-foreground">
                          +{createdCount} new · {updatedCount} updated · {snapshot.tournaments.skipped + snapshot.cashGames.skipped} skipped
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No runs yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{snapshot ? snapshot.missingRooms.length : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {providerRows.map(({ connector, health, stats, snapshot }) => {
            const successPct = Math.round((health.successRate ?? stats.successRate ?? 0) * 100);
            return (
              <div key={`${connector.name}-mobile`} className="rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{connector.name}</p>
                    <p className="text-xs text-muted-foreground">{connector.type} connector</p>
                  </div>
                  <StatusPill status={health.status} />
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Success</span>
                    <span className="font-semibold">{successPct}%</span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Last run</p>
                    <p className="font-semibold">
                      {snapshot?.completedAt ? formatDateTime(snapshot.completedAt) : "Pending"}
                    </p>
                  </div>
                  {snapshot ? (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Created</p>
                        <p className="text-base font-semibold">
                          {snapshot.tournaments.created + snapshot.cashGames.created}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Updated</p>
                        <p className="text-base font-semibold">
                          {snapshot.tournaments.updated + snapshot.cashGames.updated}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Skipped</p>
                        <p className="text-base font-semibold">
                          {snapshot.tournaments.skipped + snapshot.cashGames.skipped}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Run the fetch endpoint to populate stats.</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Unmatched rooms</span>
                    <span className="font-semibold">{snapshot ? snapshot.missingRooms.length : "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {recentRuns.length ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent runs</p>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Run ID</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Skipped</th>
                    <th className="px-4 py-3">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentRuns.map((run) => (
                    <tr key={run.runId}>
                      <td className="px-4 py-3 font-mono text-xs">{run.runId.slice(0, 8)}</td>
                      <td className="px-4 py-3">{run.provider}</td>
                      <td className="px-4 py-3">{formatDateTime(run.completedAt)}</td>
                      <td className="px-4 py-3">{run.tournaments.created + run.cashGames.created}</td>
                      <td className="px-4 py-3">{run.tournaments.updated + run.cashGames.updated}</td>
                      <td className="px-4 py-3">{run.tournaments.skipped + run.cashGames.skipped}</td>
                      <td className="px-4 py-3">{run.errors.length ? run.errors.length : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {recentRuns.map((run) => (
                <div key={`${run.runId}-card`} className="rounded-2xl border p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{run.provider}</p>
                    <span className="font-mono text-xs text-muted-foreground">#{run.runId.slice(0, 6)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(run.completedAt)}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-base font-semibold">
                        {run.tournaments.created + run.cashGames.created}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-muted-foreground">Updated</p>
                      <p className="text-base font-semibold">
                        {run.tournaments.updated + run.cashGames.updated}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-muted-foreground">Skipped</p>
                      <p className="text-base font-semibold">
                        {run.tournaments.skipped + run.cashGames.skipped}
                      </p>
                    </div>
                  </div>
                  {run.errors.length ? (
                    <p className="mt-2 text-xs text-destructive">Errors: {run.errors.length}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: number;
  caption?: string;
  tone?: "default" | "warning";
}) {
  const badgeClass = tone === "warning" ? "text-amber-600" : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="space-y-1">
        <p className={`text-xs uppercase tracking-wide ${badgeClass}`}>{label}</p>
        <CardTitle className="text-3xl">{value}</CardTitle>
        {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
      </CardHeader>
      <CardContent />
    </Card>
  );
}

function IngestionStatCard({
  label,
  value,
  caption,
  tone = "default",
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: "default" | "warning";
}) {
  const badgeClass = tone === "warning" ? "text-amber-600" : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="space-y-1">
        <p className={`text-xs uppercase tracking-wide ${badgeClass}`}>{label}</p>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
      </CardHeader>
      <CardContent />
    </Card>
  );
}

function StatusPill({ status }: { status: "healthy" | "degraded" | "down" }) {
  const variants: Record<typeof status, string> = {
    healthy: "bg-emerald-100 text-emerald-800",
    degraded: "bg-amber-100 text-amber-800",
    down: "bg-destructive/20 text-destructive",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDateTime(value: string | Date) {
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
  } catch {
    return "—";
  }
}
