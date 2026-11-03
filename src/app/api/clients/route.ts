import { db } from "@/db";
import { clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.name) return Response.json({ error: "اسم العميل مطلوب" }, { status: 400 });
    const [row] = await db
      .insert(clients)
      .values({
        name: String(b.name),
        company: b.company || null,
        email: b.email || null,
        phone: b.phone || null,
        status: b.status || "lead",
        notes: b.notes || null,
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
    const patch: Partial<typeof clients.$inferInsert> = {};
    for (const k of ["name", "company", "email", "phone", "status", "notes"] as const) {
      if (b[k] !== undefined) patch[k] = b[k];
    }
    const [row] = await db.update(clients).set(patch).where(eq(clients.id, b.id)).returning();
    return Response.json(row ?? { error: "غير موجود" });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "المعرّف مطلوب" }, { status: 400 });
    await db.delete(clients).where(eq(clients.id, b.id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
