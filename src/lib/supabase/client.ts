import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseBrowserPublishableKey,
  getSupabaseBrowserUrl,
} from "@/lib/supabase/env";

export function createClient() {
  return createBrowserClient(
    getSupabaseBrowserUrl()!,
    getSupabaseBrowserPublishableKey()!
  );
}
