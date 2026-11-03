import { db } from "@/db";
import { projects, transactions } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(transactions).orderBy(desc(transactions.date)).limit(500);
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const amount = Number(b.amount);
    if (!amount || amount <= 0) return Response.json({ error: "المبلغ غير صالح" }, { status: 400 });
    const kind = b.kind === "income" ? "income" : "expense";
    const [row] = await db
      .insert(transactions)
      .values({
        kind,
        amount,
        category: b.category || "عام",
        note: b.note || null,
        projectId: b.projectId || null,
        date: b.date ? new Date(b.date) : new Date(),
      })
      .returning();
    if (kind === "expense" && row.projectId) {
      await db
        .update(projects)
        .set({ spent: sql`${projects.spent} + ${amount}` })
        .where(eq(projects.id, row.projectId));
    }
    return Response.json(row);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const b = await req.json();
    if (!b.id) return Response.json({ error: "المعرّف مطلوب" }, { status: 400 });
    await db.delete(transactions).where(eq(transactions.id, b.id));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
