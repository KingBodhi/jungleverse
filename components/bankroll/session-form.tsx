"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GameType, GameVariant, BankrollAccount } from "@prisma/client";
import { PROVIDERS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const sessionFormSchema = z.object({
  bankrollAccountId: z.string().min(1, "Select an account"),
  sessionType: z.nativeEnum(GameType),
  variant: z.nativeEnum(GameVariant),
  buyIn: z.number().positive("Buy-in must be positive"),
  cashOut: z.number().nonnegative(),
  stakesDescription: z.string().max(50).optional().or(z.literal("")),
  venueName: z.string().max(100).optional().or(z.literal("")),
  durationMinutes: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

function getProviderLabel(provider: string) {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}

interface Props {
  onSuccess?: () => void;
}

export function LogSessionForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankrollAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      bankrollAccountId: "",
      sessionType: GameType.CASH,
      variant: GameVariant.NLHE,
      buyIn: 0,
      cashOut: 0,
      stakesDescription: "",
      venueName: "",
      durationMinutes: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("/api/bankroll/accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.data || []);
        }
      } catch {
        // Ignore errors
      } finally {
        setLoadingAccounts(false);
      }
    }
    if (open) {
      fetchAccounts();
    }
  }, [open]);

  async function onSubmit(values: SessionFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bankroll/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Convert dollars to cents
          buyIn: Math.round(values.buyIn * 100),
          cashOut: Math.round(values.cashOut * 100),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log session");
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log session");
    } finally {
      setIsSubmitting(false);
    }
  }

  const watchBuyIn = form.watch("buyIn");
  const watchCashOut = form.watch("cashOut");
  const result = (watchCashOut || 0) - (watchBuyIn || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Log Session</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Poker Session</DialogTitle>
          <DialogDescription>
            Record a completed cash game or tournament session.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bankrollAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingAccounts ? (
                        <SelectItem value="" disabled>Loading...</SelectItem>
                      ) : accounts.length === 0 ? (
                        <SelectItem value="" disabled>No accounts found</SelectItem>
                      ) : (
                        accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.nickname || getProviderLabel(account.provider)} - ${(account.balance / 100).toFixed(0)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="sessionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash Game</SelectItem>
                        <SelectItem value="TOURNAMENT">Tournament</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NLHE">No Limit Hold&apos;em</SelectItem>
                        <SelectItem value="PLO">Pot Limit Omaha</SelectItem>
                        <SelectItem value="PLO5">PLO5</SelectItem>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="buyIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy-in ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cashOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash-out ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Result preview */}
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Result</p>
              <p className={`text-xl font-bold ${result >= 0 ? "text-green-600" : "text-red-600"}`}>
                {result >= 0 ? "+" : ""}${result.toFixed(2)}
              </p>
            </div>

            <FormField
              control={form.control}
              name="stakesDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stakes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1/2 NL, $200 tournament" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bellagio, PokerStars" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes, optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? parseInt(val) : undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Session notes, key hands, observations..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Max 1000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || accounts.length === 0}>
                {isSubmitting ? "Saving..." : "Log Session"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
