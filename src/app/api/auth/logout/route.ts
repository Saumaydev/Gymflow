import { NextResponse } from "next/server";
import { clearedSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set(clearedSessionCookie());
  return response;
}

export async function GET(request: Request) {
  return POST(request);
}
