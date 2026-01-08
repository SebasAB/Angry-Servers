"use client";

import dynamic from "next/dynamic";

// Disable SSR completely for this page since it uses Phaser which requires browser APIs
const PlayGame = dynamic(() => import("./PlayGame"), {
  ssr: false,
});

export default function PlayPage({
  searchParams,
}: {
  searchParams: { level?: string };
}) {
  return <PlayGame searchParams={searchParams} />;
}
