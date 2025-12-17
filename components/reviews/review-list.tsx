"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useHydration } from "@/hooks/use-hydration";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ReviewListProps {
  pokerRoomId: string;
  refreshKey: number;
}

export function ReviewList({ pokerRoomId, refreshKey }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isClient = useHydration();

  useEffect(() => {
    async function fetchReviews() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/rooms/${pokerRoomId}/reviews`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [pokerRoomId, refreshKey]);

  if (isLoading) {
    return <div>Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return <div>Be the first to review this room!</div>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="flex space-x-4">
          <Avatar>
            <AvatarImage src={review.user.image ?? undefined} />
            <AvatarFallback>
              {review.user.name?.charAt(0).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{review.user.name ?? "Anonymous"}</div>
              <div className="text-xs text-muted-foreground">
                {isClient && formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </div>
            </div>
            <div className="flex items-center my-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{review.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
