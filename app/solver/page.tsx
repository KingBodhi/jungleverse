"use client";

import dynamic from "next/dynamic";

const SolverShell = dynamic(
  () => import("@/components/solver/solver-shell").then((m) => m.SolverShell),
  { ssr: false }
);

export default function SolverPage() {
  return <SolverShell />;
}
