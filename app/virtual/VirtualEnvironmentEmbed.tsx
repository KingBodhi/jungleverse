"use client";

import { useEffect, useState, useRef } from "react";

interface VirtualEnvironmentEmbedProps {
  initialSrc: string;
}

/**
 * Client component that renders the PCG virtual environment iframe.
 * Handles token refresh every 4 minutes to keep the session alive.
 */
export function VirtualEnvironmentEmbed({ initialSrc }: VirtualEnvironmentEmbedProps) {
  const [iframeSrc, setIframeSrc] = useState(initialSrc);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Refresh token every 4 minutes (before 5 min expiry)
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await fetch("/api/pcg-token");
        if (!response.ok) {
          throw new Error("Failed to refresh token");
        }
        const { token } = await response.json();
        const pcgUrl = process.env.NEXT_PUBLIC_PCG_URL || "http://localhost:3001";
        setIframeSrc(`${pcgUrl}/embed/virtual-environment?token=${token}`);
      } catch (err) {
        console.error("Token refresh failed:", err);
        setError("Session expired. Please refresh the page.");
      }
    };

    const interval = setInterval(refreshToken, 4 * 60 * 1000); // 4 minutes
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-amber-400 text-lg mb-2">Session Error</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
