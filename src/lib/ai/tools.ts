/** تعريفات أدوات الوكيل بصيغة OpenAI (تُستخدم للنماذج السحابية) */

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
});

export const TOOL_DEFS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_overview",
      description: "نظرة شاملة على حالة الأعمال: المشاريع، المهام، الرصيد، العملاء",
      parameters: obj({}),
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "عرض قائمة المشاريع مع حالتها وتقدمها",
      parameters: obj({ status: { type: "string", enum: ["active", "paused", "done", "archived"] } }),
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "إنشاء مشروع جديد",
      parameters: obj(
        {
          name: { type: "string" },
          client: { type: "string", description: "اسم العميل (اختياري)" },
          description: { type: "string" },
          budget: { type: "number" },
          deadline: { type: "string", description: "تاريخ بصيغة YYYY-MM-DD" },
        },
        ["name"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description: "تحديث مشروع قائم (التقدم، الحالة، الميزانية...)",
      parameters: obj(
        {
          id: { type: "string" },
          name: { type: "string" },
          status: { type: "string", enum: ["active", "paused", "done", "archived"] },
          progress: { type: "number" },
          budget: { type: "number" },
          description: { type: "string" },
        },
        ["id"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "عرض المهام مع إمكانية التصفية حسب الحالة",
      parameters: obj({ status: { type: "string", enum: ["backlog", "todo", "doing", "review", "done"] } }),
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "إضافة مهمة جديدة",
      parameters: obj(
        {
          title: { type: "string" },
          project: { type: "string", description: "معرّف المشروع أو اسمه" },
          priority: { type: "string", enum: ["low", "med", "high", "urgent"] },
          status: { type: "string", enum: ["backlog", "todo", "doing", "review", "done"] },
          due: { type: "string", description: "YYYY-MM-DD" },
        },
        ["title"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "move_task",
      description: "نقل مهمة إلى حالة أخرى (مثلاً: إنجاز مهمة)",
      parameters: obj(
        {
          id: { type: "string" },
          status: { type: "string", enum: ["backlog", "todo", "doing", "review", "done"] },
        },
        ["id", "status"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "تسجيل معاملة مالية (إيراد أو مصروف)",
      parameters: obj(
        {
          kind: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number" },
          category: { type: "string" },
          note: { type: "string" },
          project: { type: "string", description: "معرّف أو اسم مشروع لربط المصروف به" },
        },
        ["kind", "amount"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "finance_summary",
      description: "ملخص مالي: الإيرادات والمصروفات والرصيد وفئات الصرف",
      parameters: obj({}),
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "عرض قائمة العملاء",
      parameters: obj({}),
    },
  },
  {
    type: "function",
    function: {
      name: "add_client",
      description: "إضافة عميل جديد",
      parameters: obj(
        {
          name: { type: "string" },
          company: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          notes: { type: "string" },
        },
        ["name"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "حفظ ملاحظة أو تقرير",
      parameters: obj(
        {
          title: { type: "string" },
          body: { type: "string" },
          kind: { type: "string", enum: ["note", "report"] },
        },
        ["title", "body"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "فتح قسم من أقسام البرنامج للمستخدم",
      parameters: obj(
        {
          view: {
            type: "string",
            enum: ["dashboard", "projects", "board", "finance", "clients", "browser", "notes", "settings"],
          },
        },
        ["view"]
      ),
    },
  },
  {
    type: "function",
    function: {
      name: "browser_open",
      description: "فتح رابط في المتصفح المدمج أمام المستخدم",
      parameters: obj({ url: { type: "string" } }, ["url"]),
    },
  },
  {
    type: "function",
    function: {
      name: "browser_read",
      description: "قراءة محتوى صفحة ويب كنص (للبحث والتلخيص والبحث عن معلومات)",
      parameters: obj({ url: { type: "string" } }, ["url"]),
    },
  },
];

export const TOOL_NAMES = new Set(TOOL_DEFS.map((t) => t.function.name));
