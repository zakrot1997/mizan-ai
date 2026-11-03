"use client";

import useSWR, { mutate as swrMutate } from "swr";

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `خطأ ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useApi<T = unknown>(key: string | null) {
  return useSWR<T>(key, key ? fetcher<T> : null, {
    revalidateOnFocus: false,
    dedupingInterval: 1500,
  });
}

/** إبطال ذاكرة SWR بعد أي تعديل (من المستخدم أو من الوكيل الذكي) */
export function invalidate(keys: string[]) {
  for (const k of keys) {
    swrMutate(
      (current: unknown) => typeof current === "string" && current.startsWith(k),
      undefined,
      { revalidate: true }
    );
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `خطأ ${res.status}`);
  return data as T;
}

export const api = {
  get: <T>(url: string) => req<T>("GET", url),
  post: <T>(url: string, body?: unknown) => req<T>("POST", url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => req<T>("PATCH", url, body ?? {}),
  del: <T>(url: string, body?: unknown) => req<T>("DELETE", url, body ?? {}),
};
