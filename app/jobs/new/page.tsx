import { createJob } from "@/app/actions";
import { Back } from "@/components/bits";
import { JobForm } from "@/components/forms";
import { Shell } from "@/components/Shell";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function NewJob({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const { contact } = await searchParams;
  const book = await store().load();
  const contacts = [...book.contacts].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Shell>
      <Back href={contact ? `/people/${contact}` : "/jobs"} label="Back" />
      <div className="page-head"><h1 className="title">New job</h1></div>
      <JobForm action={createJob} contacts={contacts} contactId={contact} submitLabel="Add job" />
    </Shell>
  );
}
