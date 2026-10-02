# Ellison & Co. — Job Book

A private, phone-first job book for a two-person painting crew: contacts, a six-stage job pipeline, follow-up reminders, and an **Ask** tab that answers questions from your own records.

## What's in it

| Screen | What it does |
|---|---|
| **Today** | Quotes with no reply after 5 days, follow-ups due, jobs on the go, booked work in the next 14 days, finished jobs not yet paid, and how many people have gone quiet. |
| **Jobs** | The pipeline: New lead → Quoted → Booked → In progress → Done / Lost. Each job has the address, room, quote, the date they want it, and a notes box. Tap a stage to move it. |
| **People** | Search everyone by name, phone, street or room. Each person has Call / Text / Map buttons, their jobs, a follow-up reminder and a history log. |
| **Gone quiet** | Everyone with no logged contact in 30+ days. |
| **Import** | Paste straight from Google Sheets (or upload a CSV). Columns are matched by name; anyone already in the book is skipped. |
| **Ask** | Chat with your book (below). |

Two small guards against the mess this replaces: adding a person who's already in the book, or a second open job for the same room at the same address, asks you to confirm first.

### How the reminders work

- **Quote with no reply:** the job is in *Quoted*, nothing has been logged as *They replied* since the quote went out, and it's been 5+ days since the quote (or since you last logged *I followed up*, so following up gives them another 5 days). Tap *They replied* on the job and it drops off.
- **Gone quiet:** nothing in someone's history (a note, a follow-up, a reply, a stage change) for 30 days.

## The Ask tab

The assistant can only see your book through these tools. It has no other knowledge of your customers:

| Tool | Used for |
|---|---|
| `find_people` | Finds people by name, phone, street, or a room on their job ("the Davis kitchen"). An empty result means *not in the book*. |
| `get_person` | Full file: details, jobs, follow-up, history. |
| `find_jobs` | Filter by stage, room, quote date range, wanted date range, "no reply since quote", "unpaid". |
| `quotes_waiting` | The 5-day reminder list. |
| `quiet_people` | The 30-day list. |
| `business_summary` | Totals per stage, unpaid jobs, follow-ups due, next 14 days. |
| `add_note` | Saves a dated note to a person (and to a job's notes box). |
| `set_follow_up` | "Call Thursday" puts them on Today that day. |
| `log_contact` | Records *I reached out* / *They replied*. |
| `update_job` | Moves stage, changes quote or date, marks paid. |
| `add_lead` | Adds a new person + New lead job. Refuses if they're already in the book. |
| `prepare_text` | Puts a draft text on screen with **Copy** and **Open in Messages**. Nothing is ever sent for you. |

How it avoids making things up:

- Its instructions say to look up every person, date and amount, and to say "not in the book" when a search comes back empty.
- Any change needs a real record ID from a lookup. A made-up ID is rejected.
- Before an answer is shown, every link to a person or job is checked against the records it actually looked up. A link to anything else is shown as plain text, not a link.
- Every change it makes shows as a green receipt you can tap to check.

Example questions: *Who did I quote last week and never heard back from?* · *Draft a short text to the Davis kitchen. Polite, not salesy.* · *Which jobs are booked in the next 14 days?* · *Add a note on Priya Shah: she wants the hallway included, call Thursday.* · *Who still owes me?*

## Running it

### Try it locally (sample data)

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Supabase keys it runs in **demo mode** on fake sample data that resets on restart. Add `ANTHROPIC_API_KEY` to `.env.local` to switch on the Ask tab.

### Go live (Supabase + Vercel, about 15 minutes)

1. **Supabase:** create a project → *SQL Editor* → paste and run `supabase/schema.sql`.
   Copy the *Project URL* and the *service_role* key from *Project Settings → API*.
2. **Vercel:** import this repo as a new project and add these environment variables:
   - `APP_PASSCODE`: the passcode you'll type on your phone
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`: from console.anthropic.com
3. Deploy, open the URL on your phone, enter the passcode, then use *Share → Add to Home Screen*. You stay signed in for 6 months; *Lock* (top right) signs out.
4. Bring your contacts over with **People → Import from sheet**.

Optional: `npm run seed` (with the Supabase variables set) loads the sample data into an *empty* database so you can try things before importing real contacts.

### Privacy

- The whole site is behind the passcode, and search engines are told not to index it.
- The database has Row Level Security turned on with no public policies. Only the app's server, using the service-role key, can read or write it. That key is never sent to the browser.
- Questions in the Ask tab are sent to Anthropic's API along with the records the assistant looks up.

## Development

```bash
npm test           # reminder rules, the four example questions at tool level, anti-invention checks, import parsing
npm run typecheck
npm run build
```

Stack: Next.js (App Router, server actions), Supabase Postgres, Anthropic TypeScript SDK (`claude-opus-5-5` by default, override with `CLAUDE_MODEL`). All dates are Toronto calendar days.
