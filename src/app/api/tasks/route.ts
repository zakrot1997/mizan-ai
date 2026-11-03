import { db } from "@/db";
import { tasks } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(tasks).orderBy(asc(tasks.position), asc(tasks.createdAt));
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.title) return Response.json({ error: "عنوان المهمة مطلوب" }, { status: 400 });
    const [row] = await db
      .insert(tasks)
      .values({
        title: String(b.title),
        notes: b.notes || null,
        status: b.status || "todo",
        priority: b.priority || "med",
        projectId: b.projectId || null,
        due: b.due ? new Date(b.due) : null,
        position: Number(b.position) || 0,
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
    const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    for (const k of ["title", "notes", "status", "priority", "projectId"] as const) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    if (b.position !== undefined) patch.position = Number(b.position) || 0;
    if (b.due !== undefined) patch.due = b.due ? new Date(b.due) : null;
    const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, b.id)).returning();
    return Response.json(row ?? { error: "غير موجودة" });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "المعرّف مطلوب" }, { status: 400 });
    await db.delete(tasks).where(eq(tasks.id, b.id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
