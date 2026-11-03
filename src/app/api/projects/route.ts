import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.name) return Response.json({ error: "اسم المشروع مطلوب" }, { status: 400 });
    const [row] = await db
      .insert(projects)
      .values({
        name: String(b.name),
        client: b.client || null,
        description: b.description || null,
        color: b.color || "#22d3ee",
        status: b.status || "active",
        progress: Math.max(0, Math.min(100, Number(b.progress) || 0)),
        budget: Number(b.budget) || 0,
        deadline: b.deadline ? new Date(b.deadline) : null,
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
    const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
    for (const k of ["name", "client", "description", "color", "status"] as const) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    if (b.progress !== undefined) patch.progress = Math.max(0, Math.min(100, Number(b.progress) || 0));
    if (b.budget !== undefined) patch.budget = Number(b.budget) || 0;
    if (b.spent !== undefined) patch.spent = Number(b.spent) || 0;
    if (b.deadline !== undefined) patch.deadline = b.deadline ? new Date(b.deadline) : null;
    const [row] = await db.update(projects).set(patch).where(eq(projects.id, b.id)).returning();
    return Response.json(row ?? { error: "غير موجود" });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "المعرّف مطلوب" }, { status: 400 });
    await db.delete(projects).where(eq(projects.id, b.id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
