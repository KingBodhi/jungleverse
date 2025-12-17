"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useHydration } from "@/hooks/use-hydration";

interface WaitTime {
  id: string;
  minutes: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
  };
}

interface WaitTimeListProps {
  gameId: string;
  refreshKey: number;
}

export function WaitTimeList({ gameId, refreshKey }: WaitTimeListProps) {
  const [waitTimes, setWaitTimes] = useState<WaitTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isClient = useHydration();

  useEffect(() => {
    async function fetchWaitTimes() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/games/${gameId}/wait-times`);
        if (response.ok) {
          const data = await response.json();
          setWaitTimes(data);
        }
      } catch (error) {
        console.error("Failed to fetch wait times", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWaitTimes();
  }, [gameId, refreshKey]);

  if (isLoading) {
    return <div>Loading wait times...</div>;
  }

  if (waitTimes.length === 0) {
    return <div>No wait times reported yet.</div>;
  }

  const latestWaitTime = waitTimes[0];

  return (
    <div className="text-sm text-muted-foreground">
      <span>
        Reported wait time: <strong>{latestWaitTime.minutes} minutes</strong>
      </span>
      <span className="ml-2">
        {isClient && (`(${formatDistanceToNow(new Date(latestWaitTime.createdAt), { addSuffix: true })})`)}
      </span>
    </div>
  );
}
