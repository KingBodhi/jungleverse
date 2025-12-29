"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TransactionType, BankrollAccount } from "@prisma/client";
import { PROVIDERS, TRANSACTION_TYPES } from "@/lib/constants";
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

const transactionFormSchema = z.object({
  bankrollAccountId: z.string().min(1, "Select an account"),
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().max(500).optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

function getProviderLabel(provider: string) {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}

interface Props {
  onSuccess?: () => void;
}

export function AddTransactionForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankrollAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      bankrollAccountId: "",
      type: TransactionType.DEPOSIT,
      amount: 0,
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

  async function onSubmit(values: TransactionFormValues) {
    setIsSubmitting(true);
    setError(null);

    // Determine if amount should be negative
    const isOutflow = ["WITHDRAWAL", "TRANSFER_OUT"].includes(values.type);
    const amountCents = Math.round(values.amount * 100) * (isOutflow ? -1 : 1);

    try {
      const res = await fetch("/api/bankroll/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          amount: amountCents,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add transaction");
      }

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add transaction");
    } finally {
      setIsSubmitting(false);
    }
  }

  const allowedTypes = TRANSACTION_TYPES.filter(
    (t) => !["SESSION_BUYIN", "SESSION_CASHOUT"].includes(t.value)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Transaction</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a deposit, withdrawal, or other bankroll transaction.
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

            <FormField
              control={form.control}
              name="type"
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
                      {allowedTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <span className="flex items-center gap-2">
                            <span className="w-4 text-center">{type.icon}</span>
                            {type.label}
                          </span>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly deposit" {...field} />
                  </FormControl>
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
                {isSubmitting ? "Adding..." : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
