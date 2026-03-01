import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solver | Jungleverse",
  description: "CFR Poker Solver — Kuhn, Leduc, and NLHE subgame solving",
};

export default function SolverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dark min-h-dvh bg-background text-foreground">{children}</div>;
}
