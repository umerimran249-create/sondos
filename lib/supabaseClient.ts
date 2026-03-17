import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { cookies as cookiesType } from "next/headers";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createSupabaseServerClient(cookies: ReturnType<typeof cookiesType>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookies.set({ name, value: "", ...options });
        },
      },
    }
  );
}

