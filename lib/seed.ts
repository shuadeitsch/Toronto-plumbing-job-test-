// Fake but realistic book for demos and first-run. Dates are relative to today
// so the reminders, "last week" and "next 14 days" always have something to show.
import { addDays, todayISO } from "./dates";
import type { Activity, ActivityKind, Book, Contact, Job, Source, Stage } from "./types";

type SeedJob = {
  room: string;
  stage: Stage;
  quote?: number;
  quotedAgo?: number;
  wantedIn?: number;
  createdAgo: number;
  notes?: string;
  paid?: boolean;
  address?: string;
};

type SeedPerson = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  source: Source;
  addedAgo: number;
  followUpIn?: number;
  followUpNote?: string;
  jobs: SeedJob[];
  log?: [daysAgo: number, kind: ActivityKind, body: string, jobIndex?: number][];
};

const PEOPLE: SeedPerson[] = [
  {
    name: "Priya Shah",
    phone: "416-555-0142",
    email: "priya.shah@example.com",
    address: "22 Wychwood Ave, Toronto",
    source: "Instagram",
    addedAgo: 9,
    jobs: [
      {
        room: "Living room + stairwell",
        stage: "quoted",
        quote: 2850,
        quotedAgo: 3,
        wantedIn: 20,
        createdAgo: 9,
        notes: "High ceilings on the stair side. Wants Benjamin Moore Pale Oak, eggshell.",
      },
    ],
    log: [
      [9, "note", "DM'd on Instagram after seeing the Wychwood reel."],
      [6, "note", "Site visit done. Plaster in good shape, minor patching by the window.", 0],
      [3, "reached_out", "Sent quote by text.", 0],
    ],
  },
  {
    name: "Tom & Leah Davis",
    phone: "647-555-0187",
    email: "leah.davis@example.com",
    address: "148 Glebeholme Blvd, Toronto",
    source: "Neighbor",
    addedAgo: 15,
    jobs: [
      {
        room: "Kitchen — cabinets + walls",
        stage: "quoted",
        quote: 3400,
        quotedAgo: 8,
        wantedIn: 25,
        createdAgo: 15,
        notes: "Oak cabinets, 22 doors + 9 drawer fronts. Want white, not too stark. Leah is the decision maker.",
      },
    ],
    log: [
      [15, "note", "Referred by the Mackenzies down the street."],
      [11, "note", "Measured kitchen. Hardware stays on the old holes.", 0],
      [8, "reached_out", "Emailed the quote.", 0],
    ],
  },
  {
    name: "Marcus Bell",
    phone: "416-555-0119",
    email: "marcus.bell@example.com",
    address: "61 Hillsdale Ave E, Toronto",
    source: "Repeat",
    addedAgo: 420,
    jobs: [
      { room: "Basement rec room", stage: "booked", quote: 2200, quotedAgo: 19, wantedIn: 6, createdAgo: 24, notes: "Drop ceiling stays. Two coats on the block wall." },
      { room: "Front hall + powder room", stage: "done", quote: 1250, quotedAgo: 330, wantedIn: -300, createdAgo: 340, paid: true },
    ],
    log: [
      [300, "stage", "Moved to Done", 1],
      [19, "reached_out", "Sent basement quote.", 0],
      [16, "heard_back", "Said yes. Deposit coming by e-transfer.", 0],
      [16, "stage", "Moved to Booked", 0],
    ],
  },
  {
    name: "Angela Romano",
    phone: "416-555-0163",
    address: "9 Bellwoods Pl, Toronto",
    source: "Neighbor",
    addedAgo: 18,
    jobs: [{ room: "Exterior trim + front door", stage: "quoted", quote: 1950, quotedAgo: 12, wantedIn: 30, createdAgo: 18, notes: "Needs scraping on the south side. Ladder access from the laneway." }],
    log: [
      [12, "reached_out", "Dropped quote in her mailbox.", 0],
      [6, "reached_out", "Texted to check in. No answer.", 0],
    ],
  },
  {
    name: "Kevin Osei",
    phone: "647-555-0124",
    email: "kevin.osei@example.com",
    address: "302-55 Lisgar St, Toronto",
    source: "Instagram",
    addedAgo: 13,
    jobs: [{ room: "Bedroom + closet", stage: "quoted", quote: 1150, quotedAgo: 9, wantedIn: 16, createdAgo: 13, notes: "Condo. Needs elevator booking + floor protection." }],
    log: [
      [9, "reached_out", "Sent quote.", 0],
      [4, "heard_back", "Comparing two quotes, will decide by the weekend.", 0],
    ],
  },
  {
    name: "Danielle Fournier",
    phone: "416-555-0131",
    email: "d.fournier@example.com",
    address: "33 Pape Ave, Toronto",
    source: "Referral",
    addedAgo: 40,
    jobs: [{ room: "Whole main floor", stage: "in_progress", quote: 6800, quotedAgo: 30, wantedIn: -2, createdAgo: 40, notes: "Living, dining, hall. Day 2 of ~5. Colour: Simply White walls, Chantilly Lace trim." }],
    log: [
      [27, "heard_back", "Accepted the quote.", 0],
      [2, "stage", "Moved to In progress", 0],
    ],
  },
  {
    name: "Hassan Ali",
    phone: "647-555-0176",
    address: "1180 Dufferin St, Toronto",
    source: "Instagram",
    addedAgo: 1,
    jobs: [{ room: "Nursery", stage: "new", wantedIn: 35, createdAgo: 1, notes: "Baby due in December. Wants low-VOC paint." }],
    log: [[1, "note", "Asked for a quote through Instagram DMs."]],
  },
  {
    name: "Grace Liu",
    phone: "416-555-0158",
    email: "grace.liu@example.com",
    address: "27 Roxton Rd, Toronto",
    source: "Repeat",
    addedAgo: 260,
    jobs: [{ room: "Powder room", stage: "done", quote: 650, quotedAgo: 25, wantedIn: -10, createdAgo: 28, paid: false, notes: "Wallpaper removal + paint." }],
    log: [[10, "stage", "Moved to Done", 0]],
  },
  {
    name: "Robert & June Mackenzie",
    phone: "416-555-0102",
    email: "june.mackenzie@example.com",
    address: "215 Glebeholme Blvd, Toronto",
    source: "Neighbor",
    addedAgo: 60,
    jobs: [{ room: "Dining room", stage: "booked", quote: 1400, quotedAgo: 21, wantedIn: 12, createdAgo: 26, notes: "Crown moulding is fragile. Move the china cabinet together with Robert." }],
    log: [
      [18, "heard_back", "Booked. Asked us to start after 9am.", 0],
      [18, "stage", "Moved to Booked", 0],
    ],
  },
  {
    name: "Sofia Mendes",
    phone: "647-555-0139",
    address: "88 Lansdowne Ave, Toronto",
    source: "Instagram",
    addedAgo: 55,
    jobs: [{ room: "Kitchen", stage: "lost", quote: 2900, quotedAgo: 50, createdAgo: 55, notes: "Went with a cheaper crew." }],
    log: [[41, "stage", "Moved to Lost", 0]],
  },
  {
    name: "Owen Price",
    phone: "416-555-0171",
    email: "owen.price@example.com",
    address: "14 Euclid Ave, Toronto",
    source: "Neighbor",
    addedAgo: 90,
    jobs: [{ room: "Hallway + stairwell", stage: "done", quote: 1800, quotedAgo: 75, wantedIn: -46, createdAgo: 88, paid: true }],
    log: [[45, "stage", "Moved to Done", 0]],
  },
  {
    name: "Nadia Haddad",
    phone: "647-555-0193",
    email: "nadia.h@example.com",
    address: "71 Kenilworth Ave, Toronto",
    source: "Referral",
    addedAgo: 10,
    jobs: [{ room: "Kids' bedroom", stage: "quoted", quote: 890, quotedAgo: 6, wantedIn: 21, createdAgo: 10, notes: "Accent wall in navy. Two kids, one wants green." }],
    log: [[6, "reached_out", "Texted quote.", 0]],
  },
  {
    name: "Ben Carter",
    phone: "416-555-0128",
    address: "40 Withrow Ave, Toronto",
    source: "Instagram",
    addedAgo: 3,
    jobs: [{ room: "Front door + porch", stage: "new", createdAgo: 3 }],
    log: [[2, "reached_out", "Asked for photos of the porch."]],
  },
  {
    name: "Elena Petrova",
    phone: "416-555-0144",
    email: "elena.petrova@example.com",
    address: "5 Hambly Ave, Toronto",
    source: "Repeat",
    addedAgo: 500,
    jobs: [{ room: "Primary bedroom", stage: "booked", quote: 1600, quotedAgo: 14, wantedIn: 18, createdAgo: 20 }],
    log: [[11, "heard_back", "Booked for later this month.", 0]],
  },
  {
    name: "James Whitfield",
    phone: "647-555-0110",
    email: "jwhitfield@example.com",
    address: "120 Brookside Dr, Toronto",
    source: "Neighbor",
    addedAgo: 120,
    followUpIn: -1,
    followUpNote: "Ask about the basement he mentioned.",
    jobs: [{ room: "Home office", stage: "done", quote: 950, quotedAgo: 95, wantedIn: -70, createdAgo: 100, paid: true }],
    log: [[70, "stage", "Moved to Done", 0]],
  },
  {
    name: "Maya Thompson",
    phone: "416-555-0185",
    address: "19 Dovercourt Rd, Toronto",
    source: "Instagram",
    addedAgo: 6,
    jobs: [{ room: "Bathroom", stage: "new", createdAgo: 6, notes: "Mould-resistant paint. Small window, no fan." }],
  },
  {
    name: "Liam O'Connor",
    phone: "647-555-0167",
    email: "liam.oconnor@example.com",
    address: "202 Jones Ave, Toronto",
    source: "Referral",
    addedAgo: 7,
    jobs: [{ room: "Living room", stage: "quoted", quote: 1700, quotedAgo: 2, wantedIn: 28, createdAgo: 7 }],
    log: [[2, "reached_out", "Sent quote.", 0]],
  },
  {
    name: "Chloe Nguyen",
    phone: "416-555-0150",
    address: "77 Shaw St, Toronto",
    source: "Neighbor",
    addedAgo: 22,
    jobs: [{ room: "Laundry room", stage: "booked", quote: 480, quotedAgo: 15, wantedIn: 3, createdAgo: 22 }],
    log: [[13, "heard_back", "Confirmed the date.", 0]],
  },
];

const at = (dayOffset: number, today: string) => `${addDays(today, dayOffset)}T18:00:00.000Z`;

export function buildSeedBook(today = todayISO(), id: () => string = () => crypto.randomUUID()): Book {
  const book: Book = { contacts: [], jobs: [], activities: [] };
  for (const p of PEOPLE) {
    const contact: Contact = {
      id: id(),
      name: p.name,
      phone: p.phone,
      email: p.email ?? null,
      address: p.address,
      source: p.source,
      follow_up_on: p.followUpIn != null ? addDays(today, p.followUpIn) : null,
      follow_up_note: p.followUpNote ?? null,
      created_at: at(-p.addedAgo, today),
    };
    book.contacts.push(contact);
    const jobIds: string[] = [];
    for (const j of p.jobs) {
      const created = at(-j.createdAgo, today);
      const job: Job = {
        id: id(),
        contact_id: contact.id,
        address: j.address ?? p.address,
        room: j.room,
        quote: j.quote ?? null,
        quoted_on: j.quotedAgo != null ? addDays(today, -j.quotedAgo) : null,
        wanted_on: j.wantedIn != null ? addDays(today, j.wantedIn) : null,
        stage: j.stage,
        notes: j.notes ?? "",
        paid: j.paid ?? false,
        created_at: created,
        updated_at: created,
        stage_changed_at: created,
      };
      jobIds.push(job.id);
      book.jobs.push(job);
    }
    for (const [ago, kind, body, jobIndex] of p.log ?? []) {
      const a: Activity = {
        id: id(),
        contact_id: contact.id,
        job_id: jobIndex != null ? jobIds[jobIndex] : null,
        kind,
        body,
        created_at: at(-ago, today),
      };
      book.activities.push(a);
    }
  }
  return book;
}
