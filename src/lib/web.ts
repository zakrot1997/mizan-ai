/**
 * قارئ صفحات الويب — جلب آمن من الخادم + استخراج نص نظيف (وضع القراءة)
 * يستخدمه وكيل الذكاء الاصطناعي (browser_read) وواجهة المتصفح المدمج.
 */

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
];

export function assertPublicUrl(raw: string, allowLocal = false): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("رابط غير صالح");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("يسمح فقط بروابط http/https");
  }
  if (!allowLocal) {
    const host = url.hostname;
    if (PRIVATE_HOST_PATTERNS.some((p) => p.test(host))) {
      throw new Error("الروابط الداخلية محظورة في هذا الوضع");
    }
  }
  return url;
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export type PageRead = {
  url: string;
  title: string;
  siteName: string;
  text: string;
  bytes: number;
};

export async function readWebPage(raw: string, opts?: { allowLocal?: boolean }): Promise<PageRead> {
  const url = assertPublicUrl(raw, opts?.allowLocal ?? process.env.PROXY_ALLOW_LOCAL === "1");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "MizanAI-Reader/1.0 (+https://mizan.local)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        "accept-language": "ar,en;q=0.8",
      },
    });
  } finally {
    clearTimeout(timer);
  }
  const contentType = res.headers.get("content-type") || "";
  const html = await res.text();
  const bytes = html.length;

  if (!contentType.includes("text") && !contentType.includes("html") && !contentType.includes("xml")) {
    return {
      url: url.toString(),
      title: url.hostname,
      siteName: url.hostname,
      text: `المحتوى من نوع غير نصي (${contentType}) — لا يمكن عرضه كنص.`,
      bytes,
    };
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const title = decodeEntities((titleMatch?.[1] || url.hostname).trim());

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  body = body
    .replace(/<\/(p|div|section|article|h[1-6]|li|tr|br)[^>]*>/gi, "\n")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(body)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 12000);

  return {
    url: url.toString(),
    title,
    siteName: ogMatch?.[1] || url.hostname,
    text,
    bytes,
  };
}
