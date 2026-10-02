import "server-only";
import { memoryStore } from "./memory";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function isDemo(): boolean {
  return !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function store(): Store {
  return isDemo() ? memoryStore : supabaseStore;
}
