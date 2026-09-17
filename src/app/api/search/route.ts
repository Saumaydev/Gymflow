import { getCurrentUser } from "@/lib/auth";
import { searchEverything } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ members: [], trainers: [], plans: [] });

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 2) return Response.json({ members: [], trainers: [], plans: [] });

  const results = await searchEverything(user.gymId, query);
  return Response.json(results);
}
