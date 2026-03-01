import type {
  SolveRequest,
  SolveResponse,
  StrategyResponse,
  InfoSetsResponse,
  EVComparisonResponse,
  NodeLockRequest,
  NodeLockResponse,
} from "@/types/solver";

const BASE = "/api/solver";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Solver API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function startSolve(req: SolveRequest): Promise<SolveResponse> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return json<SolveResponse>(res);
}

export async function getSolveStatus(id: string): Promise<SolveResponse> {
  const res = await fetch(`${BASE}?action=status&id=${id}`);
  return json<SolveResponse>(res);
}

export async function getStrategies(
  id: string,
  keys?: string,
  prefix?: string
): Promise<StrategyResponse> {
  const params = new URLSearchParams({ action: "strategy", id });
  if (keys) params.set("keys", keys);
  if (prefix) params.set("prefix", prefix);
  const res = await fetch(`${BASE}?${params}`);
  return json<StrategyResponse>(res);
}

export async function getInfoSets(id: string): Promise<InfoSetsResponse> {
  const res = await fetch(`${BASE}?action=info-sets&id=${id}`);
  return json<InfoSetsResponse>(res);
}

export async function getEVComparison(
  id: string
): Promise<EVComparisonResponse> {
  const res = await fetch(`${BASE}?action=compare&id=${id}`);
  return json<EVComparisonResponse>(res);
}

export async function applyNodeLock(
  req: NodeLockRequest
): Promise<NodeLockResponse> {
  const res = await fetch(`${BASE}?action=nodelock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return json<NodeLockResponse>(res);
}

export async function cancelSolve(
  id: string
): Promise<{ status: string }> {
  const res = await fetch(`${BASE}?id=${id}`, { method: "DELETE" });
  return json<{ status: string }>(res);
}
