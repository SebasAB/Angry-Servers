"use client";

import { useEffect, useRef } from "react";
import { startGame, stopGame } from "@/game/Game";

export default function PlayPage({
  searchParams,
}: {
  searchParams: { level?: string };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const level = Number(searchParams.level ?? "1");
    if (!containerRef.current) return;

    startGame(containerRef.current, { level });

    return () => {
      stopGame();
    };
  }, [searchParams.level]);

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
