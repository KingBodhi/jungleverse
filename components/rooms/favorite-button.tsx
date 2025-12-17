"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  roomId: string;
  initialIsFavorite: boolean;
}

export function FavoriteButton({
  roomId,
  initialIsFavorite,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function toggleFavorite() {
    startTransition(async () => {
      try {
        if (isFavorite) {
          await fetch(`/api/favorites?pokerRoomId=${roomId}`, {
            method: "DELETE",
          });
          setIsFavorite(false);
        } else {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pokerRoomId: roomId }),
          });
          setIsFavorite(true);
        }
        router.refresh();
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFavorite}
      disabled={isPending}
      className="h-9 w-9"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn("h-5 w-5", isFavorite && "fill-red-500 text-red-500")}
      />
    </Button>
  );
}
