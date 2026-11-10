/**
 * Bootstrap the first administrator — no hardcoded credentials.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run admin:promote -- you@example.com
 *
 * The account must already exist (sign up in the app first). Run it from a trusted machine:
 * the service-role key must never be committed or exposed to the browser.
 * Alternative without this script: see docs/ADMIN_GUIDE.md (one SQL statement).
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("Usage: npm run admin:promote -- <email>");
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("profiles").update({ role: "admin" }).eq("email", email).select("id, email, role");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error(`No profile found for ${email}. Create the account in the app first.`);
  console.log(`✔ ${data[0]!.email} is now an administrator.`);
}

main().catch((error: Error) => {
  console.error(`✖ ${error.message}`);
  process.exit(1);
});
