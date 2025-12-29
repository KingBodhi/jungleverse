import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PreferencesForm } from "@/components/dashboard/preferences-form";
import { RecommendationsPanel } from "@/components/dashboard/recommendations-panel";
import { FavoriteRoomsPanel } from "@/components/dashboard/favorite-rooms-panel";
import { buildRecommendations } from "@/lib/services/recommendations";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { getFavorites } from "@/lib/services/favorites";
import { getBankrollSummary } from "@/lib/services/bankroll";
import Link from "next/link";

export default async function DashboardPage() {
  const authUser = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!user) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>User not found</CardTitle>
          </CardHeader>
          <CardContent>Please try logging in again.</CardContent>
        </Card>
      </div>
    );
  }

  const [recommendations, favorites, bankrollSummary] = await Promise.all([
    buildRecommendations({ userId: user.id, limit: 10 }),
    getFavorites(user.id),
    getBankrollSummary({ userId: user.id }).catch(() => null),
  ]);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(cents / 100);

  return (
    <div className="container py-10 space-y-8">
      {/* Bankroll Quick Stats */}
      {bankrollSummary && bankrollSummary.accountCount > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Bankroll</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(bankrollSummary.totalBalance)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Effective Bankroll</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(bankrollSummary.effectiveBankroll)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Profit</CardDescription>
              <CardTitle className={`text-2xl ${bankrollSummary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {bankrollSummary.totalProfit >= 0 ? "+" : ""}{formatCurrency(bankrollSummary.totalProfit)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="flex items-center justify-center">
            <Link
              href="/dashboard/bankroll"
              className="text-sm text-primary hover:underline"
            >
              Manage Bankroll →
            </Link>
          </Card>
        </div>
      )}

      {!bankrollSummary || bankrollSummary.accountCount === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Set Up Bankroll Tracking</CardTitle>
            <CardDescription>
              Track your balance across poker sites for better game recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/bankroll"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Preference profile</CardTitle>
          </CardHeader>
          <CardContent>
            <PreferencesForm user={user} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Recommended games</h2>
            <RecommendationsPanel recommendations={recommendations} />
          </div>
          <FavoriteRoomsPanel favorites={favorites} />
        </div>
      </div>
    </div>
  );
}
