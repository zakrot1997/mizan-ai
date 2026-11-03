/** منفّذات أدوات الوكيل على الخادم — تقرأ وتكتب قاعدة البيانات وتتحكم بالمتصفح */
import { db } from "@/db";
import { projects, tasks, transactions, clients, notes } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { SideAction } from "./protocol";
import { readWebPage } from "@/lib/web";

export type ExecResult = { result: unknown; actions?: SideAction[] };

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

async function findProjectId(ref: unknown): Promise<string | null> {
  if (!ref || typeof ref !== "string") return null;
  const rows = await db.select({ id: projects.id, name: projects.name }).from(projects);
  const exact = rows.find((r) => r.id === ref);
  if (exact) return exact.id;
  const byName = rows.find((r) => r.name.includes(ref) || ref.includes(r.name));
  return byName?.id ?? null;
}

function shortProject(p: { id: string; name: string }) {
  return `${p.name} (${p.id.slice(0, 8)})`;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ExecResult> {
  switch (name) {
    case "get_overview": {
      const [p, t, tx, c] = await Promise.all([
        db.select().from(projects),
        db.select().from(tasks),
        db.select().from(transactions),
        db.select().from(clients),
      ]);
      const income = tx.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
      const expense = tx.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
      const byStatus: Record<string, number> = {};
      t.forEach((r) => (byStatus[r.status] = (byStatus[r.status] || 0) + 1));
      return {
        result: {
          المشاريع_النشطة: p.filter((x) => x.status === "active").length,
          إجمالي_المشاريع: p.length,
          المهام: byStatus,
          الرصيد: income - expense,
          الإيرادات: income,
          المصروفات: expense,
          العملاء: c.length,
        },
      };
    }

    case "list_projects": {
      let rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
      if (args.status) rows = rows.filter((r) => r.status === args.status);
      return {
        result: rows.map((r) => ({
          id: r.id.slice(0, 8),
          الاسم: r.name,
          العميل: r.client,
          الحالة: r.status,
          التقدم: `${r.progress}%`,
          الميزانية: r.budget,
          المصروف: r.spent,
        })),
      };
    }

    case "create_project": {
      const palette = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#60a5fa"];
      const [row] = await db
        .insert(projects)
        .values({
          name: String(args.name),
          client: args.client ? String(args.client) : null,
          description: args.description ? String(args.description) : null,
          budget: num(args.budget),
          deadline: args.deadline ? new Date(String(args.deadline)) : null,
          color: palette[Math.floor(Math.random() * palette.length)],
        })
        .returning();
      return {
        result: { تم: true, مشروع: shortProject(row) },
        actions: [{ kind: "invalidate", keys: ["/api/projects", "/api/overview"] }],
      };
    }

    case "update_project": {
      const rows = await db.select().from(projects);
      const id = rows.find((r) => r.id === args.id || r.id.startsWith(String(args.id)))?.id;
      if (!id) return { result: { خطأ: "لم يتم العثور على المشروع" } };
      const patch: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (args.name) patch.name = String(args.name);
      if (args.status) patch.status = String(args.status);
      if (args.progress !== undefined) patch.progress = Math.max(0, Math.min(100, num(args.progress)));
      if (args.budget !== undefined) patch.budget = num(args.budget);
      if (args.description !== undefined) patch.description = String(args.description);
      const [row] = await db.update(projects).set(patch).where(eq(projects.id, id)).returning();
      return {
        result: { تم: true, مشروع: shortProject(row), التقدم: row.progress },
        actions: [{ kind: "invalidate", keys: ["/api/projects", "/api/overview"] }],
      };
    }

    case "list_tasks": {
      let rows = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
      if (args.status) rows = rows.filter((r) => r.status === args.status);
      const prows = await db.select().from(projects);
      return {
        result: rows.slice(0, 40).map((r) => ({
          id: r.id.slice(0, 8),
          المهمة: r.title,
          الحالة: r.status,
          الأولوية: r.priority,
          المشروع: prows.find((p) => p.id === r.projectId)?.name ?? null,
          الاستحقاق: r.due ? r.due.toISOString().slice(0, 10) : null,
        })),
      };
    }

    case "create_task": {
      const projectId = await findProjectId(args.project);
      const [row] = await db
        .insert(tasks)
        .values({
          title: String(args.title),
          projectId,
          priority: args.priority ? String(args.priority) : "med",
          status: args.status ? String(args.status) : "todo",
          due: args.due ? new Date(String(args.due)) : null,
        })
        .returning();
      return {
        result: { تم: true, مهمة: `${row.title} (${row.id.slice(0, 8)})` },
        actions: [{ kind: "invalidate", keys: ["/api/tasks", "/api/overview"] }],
      };
    }

    case "move_task": {
      const rows = await db.select().from(tasks);
      const id = rows.find((r) => r.id === args.id || r.id.startsWith(String(args.id)))?.id;
      if (!id) return { result: { خطأ: "لم يتم العثور على المهمة" } };
      const [row] = await db
        .update(tasks)
        .set({ status: String(args.status), updatedAt: new Date() })
        .where(eq(tasks.id, id))
        .returning();
      return {
        result: { تم: true, مهمة: row.title, الحالة_الجديدة: row.status },
        actions: [{ kind: "invalidate", keys: ["/api/tasks", "/api/overview"] }],
      };
    }

    case "add_transaction": {
      const projectId = await findProjectId(args.project);
      const [row] = await db
        .insert(transactions)
        .values({
          kind: String(args.kind),
          amount: num(args.amount),
          category: args.category ? String(args.category) : "عام",
          note: args.note ? String(args.note) : null,
          projectId,
        })
        .returning();
      if (row.kind === "expense" && projectId) {
        await db
          .update(projects)
          .set({ spent: sql`${projects.spent} + ${row.amount}` })
          .where(eq(projects.id, projectId));
      }
      return {
        result: { تم: true, معاملة: `${row.kind === "income" ? "إيراد" : "مصروف"} ${row.amount}` },
        actions: [
          { kind: "invalidate", keys: ["/api/transactions", "/api/overview", "/api/projects"] },
        ],
      };
    }

    case "finance_summary": {
      const tx = await db.select().from(transactions).orderBy(desc(transactions.date));
      const income = tx.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
      const expense = tx.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
      const byCat: Record<string, number> = {};
      tx.filter((r) => r.kind === "expense").forEach((r) => (byCat[r.category] = (byCat[r.category] || 0) + r.amount));
      return {
        result: { الرصيد: income - expense, الإيرادات: income, المصروفات: expense, فئات_الصرف: byCat, آخر_معاملة: tx[0] ? { kind: tx[0].kind, amount: tx[0].amount } : null },
      };
    }

    case "list_clients": {
      const rows = await db.select().from(clients).orderBy(desc(clients.createdAt));
      return { result: rows.map((r) => ({ id: r.id.slice(0, 8), الاسم: r.name, الشركة: r.company, الحالة: r.status, الهاتف: r.phone })) };
    }

    case "add_client": {
      const [row] = await db
        .insert(clients)
        .values({
          name: String(args.name),
          company: args.company ? String(args.company) : null,
          email: args.email ? String(args.email) : null,
          phone: args.phone ? String(args.phone) : null,
          notes: args.notes ? String(args.notes) : null,
          status: "lead",
        })
        .returning();
      return {
        result: { تم: true, عميل: shortProject({ id: row.id, name: row.name }) },
        actions: [{ kind: "invalidate", keys: ["/api/clients", "/api/overview"] }],
      };
    }

    case "create_note": {
      const [row] = await db
        .insert(notes)
        .values({
          title: String(args.title),
          body: String(args.body),
          kind: args.kind === "report" ? "report" : "note",
        })
        .returning();
      return {
        result: { تم: true, ملاحظة: shortProject({ id: row.id, name: row.title }) },
        actions: [{ kind: "invalidate", keys: ["/api/notes"] }, { kind: "navigate", view: "notes" }],
      };
    }

    case "navigate": {
      return {
        result: { تم: true, قسم: args.view },
        actions: [{ kind: "navigate", view: String(args.view) }],
      };
    }

    case "browser_open": {
      let url = String(args.url || "");
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      return {
        result: { تم: true, فتح: url },
        actions: [{ kind: "browser.open", url }, { kind: "navigate", view: "browser" }],
      };
    }

    case "browser_read": {
      let url = String(args.url || "");
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      try {
        const page = await readWebPage(url, { allowLocal: process.env.PROXY_ALLOW_LOCAL === "1" });
        return {
          result: {
            العنوان: page.title,
            الموقع: page.siteName,
            المحتوى: page.text.slice(0, 6000),
          },
        };
      } catch (e) {
        return { result: { خطأ: e instanceof Error ? e.message : "تعذّرت قراءة الصفحة" } };
      }
    }

    default:
      return { result: { خطأ: `أداة غير معروفة: ${name}` } };
  }
}
