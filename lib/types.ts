export const STAGES = ["new", "quoted", "booked", "in_progress", "done", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New lead",
  quoted: "Quoted",
  booked: "Booked",
  in_progress: "In progress",
  done: "Done",
  lost: "Lost",
};

export const OPEN_STAGES: Stage[] = ["new", "quoted", "booked", "in_progress"];

export const SOURCES = ["Instagram", "Neighbor", "Repeat", "Referral", "Other"] as const;
export type Source = (typeof SOURCES)[number];

export type ActivityKind = "note" | "reached_out" | "heard_back" | "stage";

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  note: "Note",
  reached_out: "I reached out",
  heard_back: "Heard back",
  stage: "Stage",
};

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  source: Source | null;
  follow_up_on: string | null; // YYYY-MM-DD
  follow_up_note: string | null;
  created_at: string; // ISO timestamp
}

export interface Job {
  id: string;
  contact_id: string;
  address: string | null;
  room: string;
  quote: number | null;
  quoted_on: string | null; // YYYY-MM-DD
  wanted_on: string | null; // YYYY-MM-DD
  stage: Stage;
  notes: string;
  paid: boolean;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
}

export interface Activity {
  id: string;
  contact_id: string;
  job_id: string | null;
  kind: ActivityKind;
  body: string;
  created_at: string;
}

export interface Book {
  contacts: Contact[];
  jobs: Job[];
  activities: Activity[];
}

export type ContactInput = Omit<Contact, "id" | "created_at"> & { created_at?: string };
export type JobInput = Omit<Job, "id" | "created_at" | "updated_at" | "stage_changed_at"> & {
  created_at?: string;
};
export type ActivityInput = Omit<Activity, "id" | "created_at"> & { created_at?: string };
