import { db } from "@/db";
import { notes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(notes)
      .orderBy(desc(notes.pinned), desc(notes.updatedAt));
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.title) return Response.json({ error: "العنوان مطلوب" }, { status: 400 });
    const [row] = await db
      .insert(notes)
      .values({
        title: String(b.title),
        body: b.body || "",
        kind: b.kind === "report" ? "report" : "note",
        pinned: Boolean(b.pinned),
      })
      .returning();
    return Response.json(row);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "المعرّف مطلوب" }, { status: 400 });
    const patch: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
    for (const k of ["title", "body", "kind"] as const) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    if (b.pinned !== undefined) patch.pinned = Boolean(b.pinned);
    const [row] = await db.update(notes).set(patch).where(eq(notes.id, b.id)).returning();
    return Response.json(row ?? { error: "غير موجودة" });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "المعرّف مطلوب" }, { status: 400 });
    await db.delete(notes).where(eq(notes.id, b.id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
