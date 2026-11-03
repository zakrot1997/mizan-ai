"use client";

/**
 * منفّذ أدوات من داخل المتصفح (لوضع نموذج wllama) —
 * ينفذ نفس أدوات الوكيل لكن عبر REST لأن قاعدة البيانات على الخادم.
 */
import { api } from "@/lib/api";
import type { SideAction } from "@/lib/ai/protocol";

export type ClientExecResult = { result: unknown; actions?: SideAction[] };

export async function executeClientTool(
  name: string,
  args: Record<string, unknown>
): Promise<ClientExecResult> {
  switch (name) {
    case "get_overview": {
      const r = await api.get<{
        counts: Record<string, number>;
        finance: { balance: number; income: number; expense: number };
        tasksByStatus: { status: string; count: number }[];
      }>("/api/overview");
      return { result: { العدادات: r.counts, المالية: r.finance && { الرصيد: r.finance.balance, الإيرادات: r.finance.income, المصروفات: r.finance.expense } } };
    }
    case "list_projects": {
      const rows = await api.get<{ id: string; name: string; status: string; progress: number; client: string | null }[]>("/api/projects");
      return {
        result: rows
          .filter((x) => !args.status || x.status === args.status)
          .map((x) => ({ id: x.id.slice(0, 8), الاسم: x.name, الحالة: x.status, التقدم: `${x.progress}%`, العميل: x.client })),
      };
    }
    case "create_project": {
      const r = await api.post<{ id: string; name: string }>("/api/projects", args);
      return {
        result: { تم: true, مشروع: `${r.name} (${r.id.slice(0, 8)})` },
        actions: [{ kind: "invalidate", keys: ["/api/projects", "/api/overview"] }],
      };
    }
    case "update_project": {
      const rows = await api.get<{ id: string }[]>("/api/projects");
      const id = rows.find((r) => r.id === args.id || r.id.startsWith(String(args.id)))?.id;
      if (!id) return { result: { خطأ: "المشروع غير موجود" } };
      await api.patch("/api/projects", { ...args, id });
      return {
        result: { تم: true },
        actions: [{ kind: "invalidate", keys: ["/api/projects", "/api/overview"] }],
      };
    }
    case "list_tasks": {
      const rows = await api.get<{ id: string; title: string; status: string; priority: string }[]>("/api/tasks");
      return {
        result: rows
          .filter((x) => !args.status || x.status === args.status)
          .slice(0, 40)
          .map((x) => ({ id: x.id.slice(0, 8), المهمة: x.title, الحالة: x.status, الأولوية: x.priority })),
      };
    }
    case "create_task": {
      let projectId: string | null = null;
      if (args.project) {
        const rows = await api.get<{ id: string; name: string }[]>("/api/projects");
        projectId = rows.find((r) => r.id === args.project || r.id.startsWith(String(args.project)) || r.name.includes(String(args.project)))?.id ?? null;
      }
      const r = await api.post<{ id: string; title: string }>("/api/tasks", {
        title: args.title,
        projectId,
        priority: args.priority || "med",
        status: args.status || "todo",
        due: args.due || null,
      });
      return {
        result: { تم: true, مهمة: `${r.title} (${r.id.slice(0, 8)})` },
        actions: [{ kind: "invalidate", keys: ["/api/tasks", "/api/overview"] }],
      };
    }
    case "move_task": {
      const rows = await api.get<{ id: string }[]>("/api/tasks");
      const id = rows.find((r) => r.id === args.id || r.id.startsWith(String(args.id)))?.id;
      if (!id) return { result: { خطأ: "المهمة غير موجودة" } };
      await api.patch("/api/tasks", { id, status: args.status });
      return {
        result: { تم: true },
        actions: [{ kind: "invalidate", keys: ["/api/tasks", "/api/overview"] }],
      };
    }
    case "add_transaction": {
      let projectId: string | null = null;
      if (args.project) {
        const rows = await api.get<{ id: string; name: string }[]>("/api/projects");
        projectId = rows.find((r) => r.id.startsWith(String(args.project)) || r.name.includes(String(args.project)))?.id ?? null;
      }
      await api.post("/api/transactions", {
        kind: args.kind,
        amount: Number(args.amount) || 0,
        category: args.category || "عام",
        note: args.note || null,
        projectId,
      });
      return {
        result: { تم: true },
        actions: [{ kind: "invalidate", keys: ["/api/transactions", "/api/overview", "/api/projects"] }],
      };
    }
    case "finance_summary": {
      const r = await api.get<{ finance: unknown }>("/api/overview");
      return { result: r.finance };
    }
    case "list_clients": {
      const rows = await api.get<{ id: string; name: string; company: string | null; status: string }[]>("/api/clients");
      return { result: rows.map((x) => ({ id: x.id.slice(0, 8), الاسم: x.name, الشركة: x.company, الحالة: x.status })) };
    }
    case "add_client": {
      const r = await api.post<{ id: string; name: string }>("/api/clients", args);
      return {
        result: { تم: true, عميل: `${r.name} (${r.id.slice(0, 8)})` },
        actions: [{ kind: "invalidate", keys: ["/api/clients", "/api/overview"] }],
      };
    }
    case "create_note": {
      const r = await api.post<{ id: string; title: string }>("/api/notes", {
        title: args.title,
        body: args.body,
        kind: args.kind === "report" ? "report" : "note",
      });
      return {
        result: { تم: true, ملاحظة: `${r.title} (${r.id.slice(0, 8)})` },
        actions: [{ kind: "invalidate", keys: ["/api/notes"] }, { kind: "navigate", view: "notes" }],
      };
    }
    case "navigate":
      return { result: { تم: true }, actions: [{ kind: "navigate", view: String(args.view) }] };
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
        const r = await api.get<{ ok: boolean; page?: { title: string; text: string }; error?: string }>(
          `/api/proxy?url=${encodeURIComponent(url)}`
        );
        if (!r.ok) return { result: { خطأ: r.error } };
        return { result: { العنوان: r.page!.title, المحتوى: r.page!.text.slice(0, 4000) } };
      } catch (e) {
        return { result: { خطأ: e instanceof Error ? e.message : "تعذّرت القراءة" } };
      }
    }
    default:
      return { result: { خطأ: `أداة غير معروفة: ${name}` } };
  }
}
