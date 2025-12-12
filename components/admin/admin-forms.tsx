"use client";

import { FormEvent, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRoomAction, createTournamentAction, createCashGameAction } from "@/app/admin/actions";

interface RoomOption {
  id: string;
  name: string;
}

interface Props {
  rooms: RoomOption[];
}

export function AdminForms({ rooms }: Props) {
  const [roomMessage, setRoomMessage] = useState<string | null>(null);
  const [tournamentMessage, setTournamentMessage] = useState<string | null>(null);
  const [cashMessage, setCashMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      brand: formData.get("brand") || undefined,
      address: formData.get("address") || undefined,
      city: formData.get("city"),
      state: formData.get("state") || undefined,
      country: formData.get("country"),
      latitude: Number(formData.get("latitude")) || undefined,
      longitude: Number(formData.get("longitude")) || undefined,
      timezone: formData.get("timezone") || undefined,
      website: formData.get("website") || undefined,
      phone: formData.get("phone") || undefined,
    };
    startTransition(async () => {
      await createRoomAction(payload);
      setRoomMessage("Room saved");
      event.currentTarget.reset();
    });
  }

  function handleTournamentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      pokerRoomId: formData.get("pokerRoomId"),
      startTime: new Date(String(formData.get("startTime"))),
      buyinAmount: Number(formData.get("buyinAmount")),
      rakeAmount: Number(formData.get("rakeAmount")) || undefined,
      startingStack: Number(formData.get("startingStack")),
      blindLevelMinutes: Number(formData.get("blindLevelMinutes")),
      reentryPolicy: formData.get("reentryPolicy") || undefined,
      bountyAmount: Number(formData.get("bountyAmount")) || undefined,
      recurringRule: formData.get("recurringRule") || undefined,
      estimatedPrizePool: Number(formData.get("estimatedPrizePool")) || undefined,
      typicalFieldSize: Number(formData.get("typicalFieldSize")) || undefined,
    };
    startTransition(async () => {
      await createTournamentAction(payload);
      setTournamentMessage("Tournament saved");
      event.currentTarget.reset();
    });
  }

  function handleCashSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      pokerRoomId: formData.get("pokerRoomId"),
      smallBlind: Number(formData.get("smallBlind")),
      bigBlind: Number(formData.get("bigBlind")),
      minBuyin: Number(formData.get("minBuyin")),
      maxBuyin: Number(formData.get("maxBuyin")),
      usualDaysOfWeek: String(formData.get("usualDaysOfWeek"))
        .split(",")
        .map((day) => day.trim())
        .filter(Boolean),
      notes: formData.get("notes") || undefined,
    };
    startTransition(async () => {
      await createCashGameAction(payload);
      setCashMessage("Cash game saved");
      event.currentTarget.reset();
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <Card>
        <form onSubmit={handleRoomSubmit} className="flex flex-col">
          <CardHeader>
            <CardTitle>New Poker Room</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input name="name" placeholder="Room name" required />
            <Input name="brand" placeholder="Brand" />
            <Input name="address" placeholder="Address" />
            <Input name="city" placeholder="City" required />
            <Input name="state" placeholder="State" />
            <Input name="country" placeholder="Country" required />
            <Input name="timezone" placeholder="Timezone" />
            <Input name="website" placeholder="Website" />
            <Input name="phone" placeholder="Phone" />
            <div className="grid grid-cols-2 gap-3">
              <Input name="latitude" placeholder="Latitude" />
              <Input name="longitude" placeholder="Longitude" />
            </div>
            <Button type="submit" disabled={isPending}>
              Save room
            </Button>
            {roomMessage && <p className="text-sm text-muted-foreground">{roomMessage}</p>}
          </CardContent>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleTournamentSubmit} className="flex flex-col">
          <CardHeader>
            <CardTitle>Add Tournament</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              name="pokerRoomId"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <Input name="startTime" type="datetime-local" required />
            <div className="grid grid-cols-2 gap-3">
              <Input name="buyinAmount" type="number" placeholder="Buy-in" required />
              <Input name="rakeAmount" type="number" placeholder="Rake" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input name="startingStack" type="number" placeholder="Stack" required />
              <Input name="blindLevelMinutes" type="number" placeholder="Level minutes" required />
            </div>
            <Input name="reentryPolicy" placeholder="Re-entry policy" />
            <Input name="bountyAmount" type="number" placeholder="Bounty" />
            <Input name="recurringRule" placeholder="Recurring rule" />
            <Input name="estimatedPrizePool" type="number" placeholder="Prize pool" />
            <Input name="typicalFieldSize" type="number" placeholder="Field size" />
            <Button type="submit" disabled={isPending}>
              Save tournament
            </Button>
            {tournamentMessage && <p className="text-sm text-muted-foreground">{tournamentMessage}</p>}
          </CardContent>
        </form>
      </Card>

      <Card>
        <form onSubmit={handleCashSubmit} className="flex flex-col">
          <CardHeader>
            <CardTitle>Add Cash Game</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              name="pokerRoomId"
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <Input name="smallBlind" type="number" placeholder="Small blind" required />
              <Input name="bigBlind" type="number" placeholder="Big blind" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input name="minBuyin" type="number" placeholder="Min buy-in" required />
              <Input name="maxBuyin" type="number" placeholder="Max buy-in" required />
            </div>
            <Textarea name="notes" placeholder="Notes" />
            <Input name="usualDaysOfWeek" placeholder="Days (Mon, Tue, Fri)" />
            <Button type="submit" disabled={isPending}>
              Save cash game
            </Button>
            {cashMessage && <p className="text-sm text-muted-foreground">{cashMessage}</p>}
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
