"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { User } from "@prisma/client";
import { userPreferenceSchema } from "@/lib/validators/users";
import { updatePreferencesAction } from "@/app/dashboard/actions";
import { BANKROLL_PROFILES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const PreferencesSchema = userPreferenceSchema;
type PreferencesValues = z.infer<typeof PreferencesSchema>;

function parseStartTimes(value: User["preferredStartTimes"]) {
  if (!value) return [] as number[];
  if (Array.isArray(value)) {
    return value.filter((item): item is number => typeof item === "number");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item: unknown): item is number => typeof item === "number")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface Props {
  user: User;
}

export function PreferencesForm({ user }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<PreferencesValues>({
    resolver: zodResolver(PreferencesSchema),
    defaultValues: {
      userId: user.id,
      bankrollProfile: user.bankrollProfile ?? "BALANCED",
      riskTolerance: user.riskTolerance ?? "MEDIUM",
      preferredStakesMin: user.preferredStakesMin ?? 1,
      preferredStakesMax: user.preferredStakesMax ?? 5,
      maxTravelDistance: user.maxTravelDistance ?? 800,
      preferredStartTimes: parseStartTimes(user.preferredStartTimes),
      preferredVariants: user.preferredVariants ?? [],
    },
  });

  function onSubmit(values: PreferencesValues) {
    setStatus(null);
    startTransition(async () => {
      await updatePreferencesAction(values);
      setStatus("Preferences updated");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="bankrollProfile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bankroll profile</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BANKROLL_PROFILES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="riskTolerance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Risk tolerance</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RISK_TOLERANCE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="preferredStakesMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred stakes (min)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? 0} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferredStakesMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred stakes (max)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value ?? 0} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="maxTravelDistance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Travel radius (km)</FormLabel>
              <FormControl>
                <Slider
                  min={50}
                  max={5000}
                  step={50}
                  value={[field.value ?? 800]}
                  onValueChange={(value) => field.onChange(value[0])}
                />
              </FormControl>
              <FormDescription>{field.value ?? 800} km max distance</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferredStartTimes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred start hours (UTC)</FormLabel>
              <FormControl>
                <Input
                  value={field.value?.join(",") ?? ""}
                  onChange={(event) => {
                    const values = event.target.value
                      .split(",")
                      .map((value) => Number(value.trim()))
                      .filter((value) => !Number.isNaN(value));
                    field.onChange(values);
                  }}
                  placeholder="e.g. 10, 18, 21"
                />
              </FormControl>
              <FormDescription>Provide comma separated hours (0-23) to bias tournaments.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferredVariants"
          render={() => (
            <FormItem>
              <FormLabel>Preferred Variants</FormLabel>
              <div className="flex flex-wrap gap-4">
                {(["NLHE", "PLO", "PLO5", "MIXED", "OTHER"] as const).map((variant) => (
                  <FormField
                    key={variant}
                    control={form.control}
                    name="preferredVariants"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(variant)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              return checked
                                ? field.onChange([...current, variant])
                                : field.onChange(current.filter((value) => value !== variant));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{variant}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save preferences"}
          </Button>
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </div>
      </form>
    </Form>
  );
}
