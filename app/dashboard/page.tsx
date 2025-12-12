import { prisma } from "@/lib/prisma";
import { PreferencesForm } from "@/components/dashboard/preferences-form";
import { RecommendationsPanel } from "@/components/dashboard/recommendations-panel";
import { buildRecommendations } from "@/lib/services/recommendations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const userId = typeof searchParams.userId === "string" ? searchParams.userId : undefined;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst();

  if (!user) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>No users found</CardTitle>
          </CardHeader>
          <CardContent>Create a user via the API to start generating recommendations.</CardContent>
        </Card>
      </div>
    );
  }

  const recommendations = await buildRecommendations({ userId: user.id, limit: 10 });

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
        <h2 className="text-2xl font-semibold">Recommended games</h2>
        <RecommendationsPanel recommendations={recommendations} />
      </div>
    </div>
  );
}
