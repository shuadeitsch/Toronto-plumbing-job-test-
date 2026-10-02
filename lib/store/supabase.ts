import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Contact, Job } from "../types";
import type { Store } from "./types";

// Server-only. Uses the service-role key, so it must never be imported into a
// client component. Row Level Security is on with no policies, which means the
// public anon key can't read anything — only this server can.
let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const toJob = (row: Record<string, unknown>): Job => ({
  ...(row as unknown as Job),
  quote: row.quote == null ? null : Number(row.quote),
});

export const supabaseStore: Store = {
  kind: "supabase",

  async load() {
    const [contacts, jobs, activities] = await Promise.all([
      db().from("contacts").select("*").order("name"),
      db().from("jobs").select("*").order("created_at", { ascending: false }),
      db().from("activities").select("*").order("created_at", { ascending: false }).limit(5000),
    ]);
    return {
      contacts: check(contacts) as Contact[],
      jobs: (check(jobs) as Record<string, unknown>[]).map(toJob),
      activities: check(activities) as Activity[],
    };
  },

  async createContact(input) {
    return check(await db().from("contacts").insert(input).select().single()) as Contact;
  },

  async createContacts(inputs) {
    if (inputs.length === 0) return [];
    return check(await db().from("contacts").insert(inputs).select()) as Contact[];
  },

  async updateContact(id, patch) {
    return check(await db().from("contacts").update(patch).eq("id", id).select().single()) as Contact;
  },

  async deleteContact(id) {
    check(await db().from("contacts").delete().eq("id", id));
  },

  async createJob(input) {
    return toJob(check(await db().from("jobs").insert(input).select().single()));
  },

  async updateJob(id, patch) {
    const extra: Record<string, string> = { updated_at: new Date().toISOString() };
    if (patch.stage) {
      const current = check(await db().from("jobs").select("stage").eq("id", id).single()) as { stage: string };
      if (current.stage !== patch.stage) extra.stage_changed_at = extra.updated_at;
    }
    return toJob(check(await db().from("jobs").update({ ...patch, ...extra }).eq("id", id).select().single()));
  },

  async deleteJob(id) {
    check(await db().from("jobs").delete().eq("id", id));
  },

  async addActivity(input) {
    return check(await db().from("activities").insert(input).select().single()) as Activity;
  },
};
