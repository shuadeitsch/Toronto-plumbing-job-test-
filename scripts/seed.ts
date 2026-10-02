// Loads the fake sample book into Supabase so you can try the real setup.
// Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed
// Refuses to run if the database already has contacts (so it can't mix with real data).
import { createClient } from "@supabase/supabase-js";
import { buildSeedBook } from "../lib/seed";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const { count, error } = await db.from("contacts").select("id", { count: "exact", head: true });
if (error) throw error;
if (count && count > 0) {
  console.error(`The database already has ${count} contacts. Not seeding.`);
  process.exit(1);
}

const book = buildSeedBook();
const tables: [string, object[]][] = [["contacts", book.contacts], ["jobs", book.jobs], ["activities", book.activities]];
for (const [table, rows] of tables) {
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`Inserted ${rows.length} ${table}`);
}
