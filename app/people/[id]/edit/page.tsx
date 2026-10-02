import { notFound } from "next/navigation";
import { updateContact } from "@/app/actions";
import { Back } from "@/components/bits";
import { ContactForm } from "@/components/forms";
import { Shell } from "@/components/Shell";
import { contactById } from "@/lib/insights";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EditPerson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = contactById(await store().load(), id);
  if (!contact) notFound();
  return (
    <Shell>
      <Back href={`/people/${id}`} label="Back" />
      <div className="page-head"><h1 className="title">Edit</h1></div>
      <ContactForm action={updateContact.bind(null, id)} contact={contact} submitLabel="Save" />
    </Shell>
  );
}
