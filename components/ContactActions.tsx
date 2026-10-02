import type { Contact } from "@/lib/types";
import { IconMail, IconMap, IconPhone, IconText } from "./icons";

const tel = (p: string) => p.replace(/[^\d+]/g, "");

export function ContactActions({ contact, address }: { contact: Contact; address?: string | null }) {
  const where = address ?? contact.address;
  return (
    <div className="actions">
      {contact.phone && <a className="btn" href={`tel:${tel(contact.phone)}`}><IconPhone /> Call</a>}
      {contact.phone && <a className="btn" href={`sms:${tel(contact.phone)}`}><IconText /> Text</a>}
      {!contact.phone && contact.email && <a className="btn" href={`mailto:${contact.email}`}><IconMail /> Email</a>}
      {where && (
        <a className="btn" href={`https://maps.apple.com/?q=${encodeURIComponent(where)}`} target="_blank" rel="noreferrer">
          <IconMap /> Map
        </a>
      )}
    </div>
  );
}
