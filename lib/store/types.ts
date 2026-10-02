import type { Activity, ActivityInput, Book, Contact, ContactInput, Job, JobInput } from "../types";

export interface Store {
  readonly kind: "supabase" | "demo";
  load(): Promise<Book>;
  createContact(input: ContactInput): Promise<Contact>;
  createContacts(inputs: ContactInput[]): Promise<Contact[]>;
  updateContact(id: string, patch: Partial<ContactInput>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  createJob(input: JobInput): Promise<Job>;
  updateJob(id: string, patch: Partial<JobInput>): Promise<Job>;
  deleteJob(id: string): Promise<void>;
  addActivity(input: ActivityInput): Promise<Activity>;
}
