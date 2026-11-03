import { db } from "@/db";
import { clients, projects, tasks, transactions } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export async function GET() {
  try {
    const [p, t, tx, c] = await Promise.all([
      db.select().from(projects),
      db.select().from(tasks),
      db.select().from(transactions).orderBy(desc(transactions.date)),
      db.select().from(clients),
    ]);

    const income = tx.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
    const expense = tx.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);

    // آخر 6 أشهر
    const monthly: { m: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const rows = tx.filter((r) => {
        const rd = new Date(r.date);
        return `${rd.getFullYear()}-${rd.getMonth()}` === key;
      });
      monthly.push({
        m: MONTHS_AR[d.getMonth()],
        income: rows.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0),
        expense: rows.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0),
      });
    }

    const catMap = new Map<string, number>();
    tx.filter((r) => r.kind === "expense").forEach((r) =>
      catMap.set(r.category, (catMap.get(r.category) ?? 0) + r.amount)
    );
    const categories = [...catMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const tasksByStatus = ["backlog", "todo", "doing", "review", "done"].map((status) => ({
      status,
      count: t.filter((r) => r.status === status).length,
    }));

    const topProjects = p
      .filter((r) => r.status !== "archived")
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        progress: r.progress,
        budget: r.budget,
        spent: r.spent,
        status: r.status,
        openTasks: t.filter((x) => x.projectId === r.id && x.status !== "done").length,
      }));

    const recent = [
      ...t.slice(0, 4).map((r) => ({
        type: "task" as const,
        title: r.title,
        at: r.createdAt.toISOString(),
      })),
      ...tx.slice(0, 4).map((r) => ({
        type: "tx" as const,
        title: `${r.kind === "income" ? "إيراد" : "مصروف"}: ${r.category} — ${r.amount}`,
        at: r.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 7);

    return Response.json({
      counts: {
        projects: p.filter((r) => r.status === "active").length,
        projectsTotal: p.length,
        tasksOpen: t.filter((r) => r.status !== "done").length,
        tasksDone: t.filter((r) => r.status === "done").length,
        clients: c.length,
      },
      finance: { income, expense, balance: income - expense, monthly, categories },
      tasksByStatus,
      topProjects,
      recent,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
