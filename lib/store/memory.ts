import { buildSeedBook } from "../seed";
import type { Book, Job } from "../types";
import type { Store } from "./types";

// Demo mode: an in-process book seeded with fake data. Used when Supabase isn't
// configured. Resets whenever the server restarts.
const g = globalThis as unknown as { __demoBook?: Book };

const now = () => new Date().toISOString();
const clone = <T>(v: T): T => structuredClone(v);

function mustFind<T extends { id: string }>(list: T[], id: string, what: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`${what} not found`);
  return found;
}

export function createMemoryStore(book: () => Book): Store {
  return {
    kind: "demo",

    async load() {
      return clone(book());
    },

    async createContact(input) {
      const c = { id: crypto.randomUUID(), created_at: now(), ...input };
      book().contacts.push(c);
      return clone(c);
    },

    async createContacts(inputs) {
      const out = [];
      for (const i of inputs) out.push(await this.createContact(i));
      return out;
    },

    async updateContact(id, patch) {
      const c = mustFind(book().contacts, id, "Contact");
      Object.assign(c, patch);
      return clone(c);
    },

    async deleteContact(id) {
      const b = book();
      b.contacts = b.contacts.filter((c) => c.id !== id);
      b.jobs = b.jobs.filter((j) => j.contact_id !== id);
      b.activities = b.activities.filter((a) => a.contact_id !== id);
    },

    async createJob(input) {
      const t = input.created_at ?? now();
      const j: Job = { id: crypto.randomUUID(), ...input, created_at: t, updated_at: t, stage_changed_at: t };
      book().jobs.push(j);
      return clone(j);
    },

    async updateJob(id, patch) {
      const j = mustFind(book().jobs, id, "Job");
      if (patch.stage && patch.stage !== j.stage) j.stage_changed_at = now();
      Object.assign(j, patch, { updated_at: now() });
      return clone(j);
    },

    async deleteJob(id) {
      const b = book();
      b.jobs = b.jobs.filter((j) => j.id !== id);
      for (const a of b.activities) if (a.job_id === id) a.job_id = null;
    },

    async addActivity(input) {
      const a = { id: crypto.randomUUID(), created_at: now(), ...input };
      book().activities.push(a);
      return clone(a);
    },
    };
  }

  export const memoryStore = createMemoryStore(() => (g.__demoBook ??= buildSeedBook()));
