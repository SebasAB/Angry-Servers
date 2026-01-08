"use client";

import { useEffect, useRef, useState } from "react";

export default function PlayGame({
  searchParams,
}: {
  searchParams: { level?: string };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stopGameRef = useRef<(() => void) | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    const level = Number(searchParams.level ?? "1");
    if (!containerRef.current) return;

    // Dynamically import game module only on client
    import("@/game/Game").then(({ startGame, stopGame }) => {
      if (!containerRef.current) return;
      startGame(containerRef.current);
      stopGameRef.current = stopGame;
    });

    return () => {
      if (stopGameRef.current) {
        stopGameRef.current();
        stopGameRef.current = null;
      }
    };
  }, [searchParams.level, isClient]);

  return (
    <main style={{ margin: 0, padding: 0 }}>
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          touchAction: "none", // important for mobile drag without scrolling
          background: "#0b1020",
        }}
      />
    </main>
  );
}
