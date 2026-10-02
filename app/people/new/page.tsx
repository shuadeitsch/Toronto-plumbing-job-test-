import { createContact } from "@/app/actions";
import { Back } from "@/components/bits";
import { ContactForm } from "@/components/forms";
import { Shell } from "@/components/Shell";

export default function NewPerson() {
  return (
    <Shell>
      <Back href="/people" label="People" />
      <div className="page-head"><h1 className="title">New person</h1></div>
      <ContactForm action={createContact} submitLabel="Save" />
    </Shell>
  );
}
