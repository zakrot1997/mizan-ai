import { readWebPage } from "@/lib/web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** قارئ الصفحات — يجلب المحتوى من الخادم ليتجاوز قيود CORS (وضع القراءة في المتصفح المدمج) */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";
  if (!url) return Response.json({ error: "الرابط مطلوب" }, { status: 400 });
  try {
    const page = await readWebPage(url, {
      allowLocal: process.env.PROXY_ALLOW_LOCAL === "1",
    });
    return Response.json({ ok: true, page });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "تعذّر الجلب" },
      { status: 400 }
    );
  }
}
