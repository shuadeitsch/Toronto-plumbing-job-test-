import { notFound } from "next/navigation";
import { updateJob } from "@/app/actions";
import { Back } from "@/components/bits";
import { JobForm } from "@/components/forms";
import { Shell } from "@/components/Shell";
import { jobById } from "@/lib/insights";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = jobById(await store().load(), id);
  if (!job) notFound();
  return (
    <Shell>
      <Back href={`/jobs/${id}`} label="Back" />
      <div className="page-head"><h1 className="title">Edit job</h1></div>
      <JobForm action={updateJob.bind(null, id)} job={job} submitLabel="Save" />
    </Shell>
  );
}
