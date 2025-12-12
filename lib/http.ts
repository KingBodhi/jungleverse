import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
