import { requireAuth } from "@/lib/auth-helpers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BankrollOverview,
  AddAccountForm,
  LogSessionForm,
  SessionsList,
  AddTransactionForm,
} from "@/components/bankroll";

export const metadata = {
  title: "Bankroll Management | JungleVerse",
  description: "Track your poker bankroll across multiple platforms",
};

export default async function BankrollPage() {
  await requireAuth();

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bankroll Management</h1>
          <p className="text-muted-foreground">
            Track your balance and sessions across all poker platforms
          </p>
        </div>
        <div className="flex gap-2">
          <AddAccountForm />
          <AddTransactionForm />
          <LogSessionForm />
        </div>
      </div>

      <BankrollOverview />

      <div className="grid gap-8 lg:grid-cols-2">
        <SessionsList limit={15} />

        <Card>
          <CardHeader>
            <CardTitle>Quick Tips</CardTitle>
            <CardDescription>Bankroll management best practices</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="text-lg">1.</span>
              <p>
                <strong className="text-foreground">Set deposit tolerance wisely.</strong>{" "}
                This represents the max you&apos;d reload on each site. It affects which games we recommend.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">2.</span>
              <p>
                <strong className="text-foreground">Log all sessions.</strong>{" "}
                Accurate tracking helps you understand your win rate and identify leaks.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">3.</span>
              <p>
                <strong className="text-foreground">5% rule.</strong>{" "}
                Ideally buy into games at 5% or less of your bankroll for that platform.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-lg">4.</span>
              <p>
                <strong className="text-foreground">Separate live and online.</strong>{" "}
                Use the Live Bankroll account for cash you bring to casinos.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
