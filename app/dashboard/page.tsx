import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PreferencesForm } from "@/components/dashboard/preferences-form";
import { RecommendationsPanel } from "@/components/dashboard/recommendations-panel";
import { FavoriteRoomsPanel } from "@/components/dashboard/favorite-rooms-panel";
import { buildRecommendations } from "@/lib/services/recommendations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getFavorites } from "@/lib/services/favorites";

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

  const [recommendations, favorites] = await Promise.all([
    buildRecommendations({ userId: user.id, limit: 10 }),
    getFavorites(user.id),
  ]);

  return (
    <div className="container grid gap-8 py-10 lg:grid-cols-[1.2fr_0.8fr]">
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
  );
}
