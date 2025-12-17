"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const waitTimeSchema = z.object({
  minutes: z.number().min(0),
});

type WaitTimeFormValues = z.infer<typeof waitTimeSchema>;

interface WaitTimeFormProps {
  gameId: string;
  onSubmitSuccess: () => void;
}

export function WaitTimeForm({ gameId, onSubmitSuccess }: WaitTimeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<WaitTimeFormValues>({
    resolver: zodResolver(waitTimeSchema),
    defaultValues: {
      minutes: 0,
    },
  });

  async function onSubmit(values: WaitTimeFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/wait-times`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to submit wait time");
      }

      form.reset();
      onSubmitSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end space-x-2">
        <FormField
          control={form.control}
          name="minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wait Time (minutes)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter wait time" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit"}
        </Button>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </form>
    </Form>
  );
}
