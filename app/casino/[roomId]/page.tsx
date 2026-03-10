import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoomAccess } from "@/lib/auth-helpers";
import { providerRegistry } from "@/lib/providers";
import { providerIngestionStore } from "@/lib/providers/ingestion-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateBrandingAction } from "./actions";

export default async function CasinoRoomPage({ params }: { params: { roomId: string } }) {
  const roomId = params.roomId;
  await requireRoomAccess(roomId);

  const room = await prisma.pokerRoom.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    notFound();
  }

  const connector = providerRegistry.find((provider) =>
    provider.pokerRooms.some((name) => name.toLowerCase() === room.name.toLowerCase())
  );
  const ingestionSnapshot = connector ? providerIngestionStore.get(connector.name) : undefined;
  const roomMissing = ingestionSnapshot?.missingRooms.some(
    (missing) => missing.toLowerCase() === room.name.toLowerCase()
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{room.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {room.city}
            {room.state ? `, ${room.state}` : ""} · {room.country}
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {room.website ? (
            <Link href={room.website} target="_blank" className="text-primary">
              {room.website}
            </Link>
          ) : null}
          <span>•</span>
          <span>{room.phone || "No phone on file"}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sync status</CardTitle>
          <p className="text-sm text-muted-foreground">
            {connector
              ? `This room syncs through the ${connector.name} connector.`
              : "No automated provider is linked to this room yet."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {connector ? (
            <div className="grid gap-4 md:grid-cols-3">
              <SyncStat label="Provider" value={connector.name} helper={connector.type} />
              <SyncStat
                label="Last run"
                value={ingestionSnapshot ? formatDateTime(ingestionSnapshot.completedAt) : "Pending"}
                helper={ingestionSnapshot ? `${ingestionSnapshot.durationMs} ms` : "Run /api/fetch-poker-data"}
              />
              <SyncStat
                label="Latest impact"
                value={ingestionSnapshot ? `+${ingestionSnapshot.tournaments.created + ingestionSnapshot.cashGames.created}` : "—"}
                helper={ingestionSnapshot ? `${ingestionSnapshot.tournaments.updated + ingestionSnapshot.cashGames.updated} updated` : "No data yet"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Reach out to Jungleverse ops if you would like this room plugged into an automated provider feed.
            </p>
          )}
          {roomMissing ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Action needed</p>
              <p>
                The latest ingestion report could not map data back to <strong>{room.name}</strong>. Double-check the spelling on the
                provider side or update your official name so it matches exactly.
              </p>
            </div>
          ) : null}
          {ingestionSnapshot && ingestionSnapshot.missingRooms.length ? (
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold text-sm">Unmatched rooms</p>
              <p>Detected {ingestionSnapshot.missingRooms.length} provider entries that need mapping.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding & imagery</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your logo, hero banner, and data source references. Leave any field blank to keep the existing value.
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateBrandingAction} className="space-y-4">
            <input type="hidden" name="roomId" value={roomId} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="logoUrl" label="Logo URL" defaultValue={room.logoUrl ?? ""} helper="Prefer an SVG or transparent PNG." />
              <Field
                id="heroImageUrl"
                label="Hero image URL"
                defaultValue={room.heroImageUrl ?? ""}
                helper="Landscape photo used on cards and detail pages."
              />
              <Field
                id="imageUrl"
                label="Fallback hero image"
                defaultValue={room.imageUrl ?? ""}
                helper="Used when no hero override is provided."
              />
              <Field
                id="cashSourceUrl"
                label="Cash game source"
                defaultValue={room.cashSourceUrl ?? ""}
                helper="Link to where lineups/waitlists are published."
              />
              <Field
                id="tournamentSourceUrl"
                label="Tournament source"
                defaultValue={room.tournamentSourceUrl ?? ""}
                helper="Link to daily schedules or series info."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  helper,
  defaultValue,
}: {
  id: string;
  label: string;
  helper?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} defaultValue={defaultValue} placeholder="https://" />
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function SyncStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function formatDateTime(value: string) {
  try {
    return Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}
