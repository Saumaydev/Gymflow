import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { members, users } from "@/db/schema";
import { guardAdmin } from "@/lib/auth";
import { encryptSecret, generateTempPassword, hashPassword } from "@/lib/crypto";
import { sanitize, toInt, writeAudit } from "@/lib/actions";
import { deleteMemberPermanently, setMemberActive, updateAvatar } from "@/lib/lifecycle";
import { parseScannedCode } from "@/lib/qr";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function loadMember(gymId: number, memberId: number) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.gymId, gymId), eq(members.id, memberId)))
    .limit(1);
  return member ?? null;
}

/** Profile edits, photo changes, password resets and activation toggles. */
export async function PATCH(request: Request, { params }: Params) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const { id } = await params;
  const memberId = Number.parseInt(id, 10);
  if (!Number.isFinite(memberId)) return Response.json({ error: "Invalid member id" }, { status: 400 });

  const member = await loadMember(user.gymId, memberId);
  if (!member) return Response.json({ error: "Member not found in this gym." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = sanitize(body.action);

  if (action === "deactivate" || action === "activate") {
    const result = await setMemberActive(user.gymId, memberId, action === "activate");
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: action === "activate" ? "ACTIVATE_MEMBER" : "DEACTIVATE_MEMBER",
      entityType: "MEMBER",
      entityId: memberId,
      oldValue: { status: result.previous },
      newValue: { status: result.status },
    });
    return Response.json({ ok: true, status: result.status });
  }

  if (action === "avatar") {
    const url = sanitize(body.url);
    if (!url) {
      // Empty value clears the photo everywhere it is rendered.
      await updateAvatar(user.gymId, { kind: "member", id: memberId }, "");
      await writeAudit({
        gymId: user.gymId,
        userId: user.id,
        action: "CLEAR_PHOTO",
        entityType: "MEMBER",
        entityId: memberId,
      });
      return Response.json({ ok: true, url: null });
    }
    await updateAvatar(user.gymId, { kind: "member", id: memberId }, url);
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE_PHOTO",
      entityType: "MEMBER",
      entityId: memberId,
      newValue: { url },
    });
    return Response.json({ ok: true, url });
  }

  if (action === "reset-password") {
    const next = generateTempPassword();
    await db
      .update(users)
      .set({ passwordHash: hashPassword(next), passwordEnc: encryptSecret(next), updatedAt: new Date() })
      .where(eq(users.id, member.userId));
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "RESET_MEMBER_PASSWORD",
      entityType: "MEMBER",
      entityId: memberId,
    });
    return Response.json({ ok: true, password: next });
  }

  if (action === "update") {
    const phone = sanitize(body.phone);
    const name = sanitize(body.name);
    if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
    await db
      .update(members)
      .set({
        name,
        phone: phone || null,
        gender: sanitize(body.gender) || null,
        address: sanitize(body.address) || null,
        emergencyContact: sanitize(body.emergencyContact) || null,
        dob: sanitize(body.dob) || null,
      })
      .where(eq(members.id, memberId));
    await db.update(users).set({ name, phone: phone || null, updatedAt: new Date() }).where(eq(users.id, member.userId));
    await writeAudit({
      gymId: user.gymId,
      userId: user.id,
      action: "UPDATE",
      entityType: "MEMBER",
      entityId: memberId,
      oldValue: { name: member.name, phone: member.phone },
      newValue: { name, phone },
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unsupported action." }, { status: 400 });
}

/** Permanent deletion — removes the profile, ledger, attendance and login. */
export async function DELETE(request: Request, { params }: Params) {
  const guard = await guardAdmin();
  if ("error" in guard) return guard.error;
  const { user } = guard;

  const { id } = await params;
  const memberId = Number.parseInt(id, 10);
  if (!Number.isFinite(memberId)) return Response.json({ error: "Invalid member id" }, { status: 400 });

  const url = new URL(request.url);
  const confirmation = parseScannedCode(url.searchParams.get("confirm") ?? "");

  const member = await loadMember(user.gymId, memberId);
  if (!member) return Response.json({ error: "Member not found in this gym." }, { status: 404 });

  if (confirmation !== member.memberCode.toUpperCase()) {
    return Response.json({ error: "Type the member code to confirm permanent deletion." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  void toInt(body.unused, 0);

  const removed = await deleteMemberPermanently(user.gymId, memberId);
  await writeAudit({
    gymId: user.gymId,
    userId: user.id,
    action: "DELETE_MEMBER",
    entityType: "MEMBER",
    entityId: memberId,
    oldValue: { name: removed.name, memberCode: removed.memberCode },
  });
  return Response.json({ ok: true, deleted: removed.memberCode });
}
