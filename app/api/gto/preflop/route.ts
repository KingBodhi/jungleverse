import { NextRequest, NextResponse } from "next/server";
import { lookupChart, listAvailableCharts, chartToStrategyEntries } from "@/lib/gto/preflop-charts";
import type { Position } from "@/lib/gto/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const position = searchParams.get("position") as Position | null;
  const scenario = searchParams.get("scenario") ?? "rfi";
  const vsPosition = (searchParams.get("vsPosition") as Position) ?? undefined;
  const list = searchParams.get("list");

  if (list === "true") {
    return NextResponse.json({ charts: listAvailableCharts() });
  }

  if (!position) {
    return NextResponse.json({ error: "position is required" }, { status: 400 });
  }

  const chart = lookupChart(position, scenario, vsPosition);
  if (!chart) {
    return NextResponse.json(
      { error: `No chart found for ${position} ${scenario}${vsPosition ? ` vs ${vsPosition}` : ""}` },
      { status: 404 },
    );
  }

  const strategies = chartToStrategyEntries(chart);
  return NextResponse.json({
    position: chart.position,
    vsPosition: chart.vsPosition ?? null,
    scenario: chart.scenario,
    stackDepth: chart.stackDepth,
    strategies,
    totalHands: strategies.length,
  });
}
