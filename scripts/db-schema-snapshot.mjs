// Portaal-gezondheidsonderzoek Blok B1: haalt een deterministische
// tekstweergave van elke RLS-policy en functie in het public-schema op (via
// de RPC get_schema_snapshot(), migratie 0137_schema_snapshot.sql) en
// vergelijkt die met het vastgelegde bestand hieronder — zo wordt een
// onbedoeld teruggevallen fix (zoals bij 0127) meteen zichtbaar als een
// git-diff op dit bestand, i.p.v. pas als een lid er in de praktijk tegenaan
// loopt.
//
// Gebruik:
//   npm run db:snapshot        -- haalt de huidige database-staat op en
//                                  schrijft 'm naar supabase/schema-snapshot.txt
//                                  (bekijk de git-diff vóór je committeert!)
//   npm run db:snapshot:check  -- haalt de huidige staat op en vergelijkt
//                                  'm met het vastgelegde bestand; faalt
//                                  (exit 1) bij een verschil, voor gebruik
//                                  in CI.
//
// Verwacht dezelfde omgevingsvariabelen als createAdminClient()
// (src/lib/supabase/admin.ts): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// — maar bewust GEEN productiesleutel: .github/workflows/ci.yml en
// update-schema-snapshot.yml wijzen dit naar een wegwerp-Supabase-stack
// (`supabase start`, alle migraties toegepast, niet-geheime demo-sleutels),
// nooit naar de live database. Lokaal met je eigen Docker-installatie kan
// dat net zo: `supabase start` en de omgevingsvariabelen overnemen uit
// `supabase status -o env`.
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SNAPSHOT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "schema-snapshot.txt");

async function fetchSnapshot() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ontbreken in de environment variables.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.rpc("get_schema_snapshot");
  if (error) {
    console.error("Opvragen van de schema-snapshot is mislukt:", error.message);
    process.exit(1);
  }
  return data;
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const current = await fetchSnapshot();

  if (!checkOnly) {
    await writeFile(SNAPSHOT_PATH, current, "utf8");
    console.log(`Schema-snapshot geschreven naar ${SNAPSHOT_PATH}. Bekijk de git-diff voor je committeert.`);
    return;
  }

  let recorded;
  try {
    recorded = await readFile(SNAPSHOT_PATH, "utf8");
  } catch {
    console.error(`Geen vastgelegde snapshot gevonden op ${SNAPSHOT_PATH}. Draai eerst 'npm run db:snapshot'.`);
    process.exit(1);
  }

  if (current === recorded) {
    console.log("Schema-snapshot komt overeen met de database. Geen afwijkingen.");
    return;
  }

  console.error(
    "Schema-snapshot wijkt af van de database: een policy of functie is gewijzigd of teruggevallen zonder dat het vastgelegde bestand is bijgewerkt.\n" +
      "Draai 'npm run db:snapshot' en controleer de diff — is de wijziging bedoeld, commit het bijgewerkte bestand mee."
  );
  process.exit(1);
}

main();
