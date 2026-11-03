import { db } from "@/db";
import { clients, notes, projects, tasks, transactions } from "@/db/schema";

export const dynamic = "force-dynamic";

/** تعبئة بيانات تجريبية واقعية لعرض قدرات النظام */
export async function POST() {
  try {
    const existing = await db.select().from(projects);
    if (existing.length > 0) {
      return Response.json({ ok: false, skipped: true, message: "توجد بيانات مسبقاً" });
    }

    const [c1, c2, c3] = await db
      .insert(clients)
      .values([
        { name: "شركة الأفق للتجارة", company: "الأفق", email: "info@ofoq.sa", phone: "0501234567", status: "active", notes: "عميل استراتيجي منذ 2023" },
        { name: "مؤسسة نمو الرقمية", company: "نمو", email: "hello@numuw.io", phone: "0559876543", status: "active" },
        { name: "مقهى روّاد", company: "روّاد", phone: "0561112233", status: "lead", notes: "مهتم بباقة المتجر الإلكتروني" },
      ])
      .returning();

    const [p1, p2, p3, p4] = await db
      .insert(projects)
      .values([
        { name: "متجر الأفق الإلكتروني", client: c1.name, color: "#22d3ee", status: "active", progress: 64, budget: 48000, spent: 21300, description: "منصة تجارة إلكترونية متكاملة مع الدفع والشحن" , deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
        { name: "هوية نمو البصرية", client: c2.name, color: "#a78bfa", status: "active", progress: 85, budget: 12000, spent: 9400, description: "شعار ودليل هوية وتطبيقات", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10) },
        { name: "تطبيق توصيل روّاد", client: c3?.name ?? null, color: "#fbbf24", status: "paused", progress: 25, budget: 60000, spent: 5000, description: "تطبيق iOS/Android — متوقف بانتظار اعتماد الميزانية" },
        { name: "الحملة التسويقية الربعية", client: c1.name, color: "#34d399", status: "done", progress: 100, budget: 15000, spent: 14200 },
      ])
      .returning();

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    await db.insert(tasks).values([
      { title: "ربط بوابة الدفع STC Pay", projectId: p1.id, status: "doing", priority: "urgent", due: new Date(now + 2 * day), position: 1 },
      { title: "تصميم صفحة المنتج", projectId: p1.id, status: "doing", priority: "high", position: 2 },
      { title: "كتابة محتوى صفحات المتجر", projectId: p1.id, status: "todo", priority: "med", position: 1 },
      { title: "اختبار سلة الشراء والشحن", projectId: p1.id, status: "todo", priority: "high", due: new Date(now + 6 * day), position: 2 },
      { title: "مراجعة نهائية للهوية مع العميل", projectId: p2.id, status: "review", priority: "high", due: new Date(now + 1 * day), position: 1 },
      { title: "تسليم ملفات الشعار بصيغ متعددة", projectId: p2.id, status: "review", priority: "med", position: 2 },
      { title: "إعداد دراسة جدوى التطبيق", projectId: p3.id, status: "backlog", priority: "low", position: 1 },
      { title: "تحديث خطة الأسعار", status: "todo", priority: "low", position: 3 },
      { title: "تقرير الأداء الشهري للحملة", projectId: p4.id, status: "done", priority: "med", position: 1 },
      { title: "أرشفة ملفات الحملة الربعية", projectId: p4.id, status: "done", priority: "low", position: 2 },
    ]);

    const txRows = [
      { kind: "income", amount: 24000, category: "دفعة مشروع", note: "الدفعة الثانية — متجر الأفق", projectId: p1.id, monthsAgo: 0 },
      { kind: "expense", amount: 3500, category: "اشتراكات", note: "استضافة وأدوات", monthsAgo: 0 },
      { kind: "expense", amount: 1200, category: "تسويق", monthsAgo: 0, projectId: p1.id },
      { kind: "income", amount: 6000, category: "دفعة مشروع", note: "دفعة هوية نمو", monthsAgo: 1 },
      { kind: "expense", amount: 4200, category: "رواتب", monthsAgo: 1 },
      { kind: "expense", amount: 800, category: "مكتب", monthsAgo: 1 },
      { kind: "income", amount: 15000, category: "دفعة مشروع", note: "إقفال الحملة الربعية", monthsAgo: 2 },
      { kind: "expense", amount: 2200, category: "إعلانات", monthsAgo: 2 },
      { kind: "expense", amount: 4200, category: "رواتب", monthsAgo: 2 },
      { kind: "income", amount: 9000, category: "استشارات", monthsAgo: 3 },
      { kind: "expense", amount: 1500, category: "سفر", monthsAgo: 3 },
      { kind: "expense", amount: 4200, category: "رواتب", monthsAgo: 3 },
      { kind: "income", amount: 20000, category: "دفعة مشروع", note: "الدفعة الأولى — متجر الأفق", monthsAgo: 4, projectId: p1.id },
      { kind: "expense", amount: 3000, category: "معدات", monthsAgo: 4 },
      { kind: "income", amount: 7500, category: "استشارات", monthsAgo: 5 },
      { kind: "expense", amount: 4100, category: "رواتب", monthsAgo: 5 },
    ].map((r) => ({
      kind: r.kind,
      amount: r.amount,
      category: r.category,
      note: r.note ?? null,
      projectId: r.projectId ?? null,
      date: new Date(now - r.monthsAgo * 30 * day - Math.floor(Math.random() * 5) * day),
    }));
    await db.insert(transactions).values(txRows);

    await db.insert(notes).values([
      { title: "أفكار تحسين التدفق النقدي", body: "1) تحصيل دفعات مقدمة 50%\n2) باقات صيانة شهرية\n3) متابعة الفواتير المتأخرة أسبوعياً", pinned: true },
      { title: "ملخص اجتماع شركة الأفق", body: "العميل راضٍ عن التقدم. طلب تسريع بوابة الدفع وإضافة تقارير مبيعات مباشرة." },
    ]);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
