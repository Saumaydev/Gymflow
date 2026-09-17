import QRCode from "qrcode";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { members, trainers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { sanitize } from "@/lib/actions";
import { qrPayload } from "@/lib/qr";

export const dynamic = "force-dynamic";

/**
 * Returns a scannable SVG QR pass for a member (or trainer) code.
 * Authorised per gym: members may only render their own pass.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const url = new URL(request.url);
  const requested = sanitize(url.searchParams.get("code")).toUpperCase();

  let code = requested;
  if (user.role === "MEMBER") {
    code = user.member?.memberCode.toUpperCase() ?? "";
  } else if (!code) {
    return new Response("A member code is required", { status: 400 });
  }

  if (!code) return new Response("No member code on this account", { status: 404 });

  const [memberRow] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.gymId, user.gymId), sql`upper(${members.memberCode}) = ${code}`))
    .limit(1);

  const [trainerRow] = memberRow
    ? []
    : await db
        .select({ id: trainers.id })
        .from(trainers)
        .where(and(eq(trainers.gymId, user.gymId), sql`upper(${trainers.trainerCode}) = ${code}`))
        .limit(1);

  if (!memberRow && !trainerRow) return new Response("Unknown code for this gym", { status: 404 });

  const svg = await QRCode.toString(qrPayload(code), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 640,
    color: { dark: "#101014", light: "#FFFFFF" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
