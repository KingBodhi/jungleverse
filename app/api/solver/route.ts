import { NextRequest, NextResponse } from "next/server";

/**
 * Solver API proxy — forwards requests to the Python CFR solver backend.
 *
 * GET  /api/solver?action=status&id=xxx     → solver status
 * GET  /api/solver?action=strategy&id=xxx   → strategy data
 * GET  /api/solver?action=info-sets&id=xxx  → info set keys
 * GET  /api/solver?action=compare&id=xxx    → EV comparison
 * POST /api/solver                          → start solve / nodelock
 */

const SOLVER_URL =
  (process.env.SOLVER_API_URL || "http://localhost:8001/api/v1/solver").trim();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const id = searchParams.get("id");

  if (!action) {
    return NextResponse.json(
      { error: "action parameter required (status, strategy, info-sets, compare)" },
      { status: 400 }
    );
  }

  try {
    let url: string;

    switch (action) {
      case "health": {
        // Direct health check — strip path suffix to get base URL
        const idx = SOLVER_URL.indexOf("/api/v1/solver");
        const base = idx > 0 ? SOLVER_URL.substring(0, idx) : SOLVER_URL;
        url = `${base}/health`;
        break;
      }
      case "status":
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        url = `${SOLVER_URL}/solve/${id}`;
        break;
      case "strategy":
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const keys = searchParams.get("keys") || "";
        const prefix = searchParams.get("prefix") || "";
        url = `${SOLVER_URL}/strategy/${id}?keys=${keys}&prefix=${prefix}`;
        break;
      case "info-sets":
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        url = `${SOLVER_URL}/info-sets/${id}`;
        break;
      case "compare":
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        url = `${SOLVER_URL}/compare/${id}`;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const resp = await fetch(url);
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err) {
    console.error("Solver proxy error:", err);
    return NextResponse.json(
      { error: "Solver backend unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "solve";

  try {
    const body = await request.json();
    let url: string;

    switch (action) {
      case "solve":
        url = `${SOLVER_URL}/solve`;
        break;
      case "nodelock":
        url = `${SOLVER_URL}/nodelock`;
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err) {
    console.error("Solver proxy error:", err);
    return NextResponse.json(
      { error: "Solver backend unavailable" },
      { status: 503 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const resp = await fetch(`${SOLVER_URL}/solve/${id}`, { method: "DELETE" });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err) {
    console.error("Solver proxy error:", err);
    return NextResponse.json(
      { error: "Solver backend unavailable" },
      { status: 503 }
    );
  }
}
