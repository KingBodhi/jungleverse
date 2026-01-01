import { Card, CardContent } from "@/components/ui/card";

export function RoomCardSkeleton() {
  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden border border-border/70 bg-card">
      <div className="h-48 w-full rounded-none bg-muted" />
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="skeleton h-3 w-16 rounded-full" />
            <div className="skeleton h-4 w-32 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3 w-20 rounded-full" />
            <div className="skeleton h-4 w-24 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="skeleton h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-32 rounded-full" />
          <div className="flex flex-wrap gap-2">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="skeleton h-6 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="skeleton h-4 w-32 rounded-full" />
          <div className="skeleton h-4 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
