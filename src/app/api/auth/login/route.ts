import { NextResponse } from "next/server";
import { authenticate, buildSessionCookie, touchLastLogin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || password.length < 4) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const session = await authenticate(email, password);
  if (!session) {
    return NextResponse.json({ error: "Those credentials don't match our records." }, { status: 401 });
  }

  const redirectTo = session.role === "ADMIN" ? "/admin" : session.role === "TRAINER" ? "/trainer" : "/member";
  touchLastLogin(session.uid);
  const response = NextResponse.json({ ok: true, role: session.role, redirectTo });
  response.cookies.set(buildSessionCookie(session));
  return response;
}
