// Vangnet (schema_migration_log, migratie 0189): leest alle
// supabase/migrations/*.sql-bestandsnamen uit en schrijft de versienummers
// weg naar src/lib/generated/migration-versions.ts. Dat gegenereerde
// bestand wordt gecommit (geen build-time fs-leesactie nodig in de
// gedeployde, serverless omgeving) en is de "wat staat er in de code"-kant
// van de vergelijking die Beheer -> Instellingen -> Systeem toont tegenover
// "wat staat er al live" (get_applied_migration_versions()-RPC).
//
// Draai dit script opnieuw (`npm run migration:manifest`) en commit het
// resultaat bij ELKE nieuwe migratie -- vergeet je dat, dan mist het
// Beheer-overzicht de nieuwste migratie in zijn vergelijking.
import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");
const outFile = join(__dirname, "..", "src", "lib", "generated", "migration-versions.ts");

const versions = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => name.slice(0, name.indexOf("_")))
  .filter((version) => /^\d{4}$/.test(version))
  .sort();

const content = `// Automatisch gegenereerd door scripts/generate-migration-manifest.mjs.
// Niet handmatig bewerken -- draai \`npm run migration:manifest\` opnieuw na
// het toevoegen van een migratie en commit het resultaat.
export const MIGRATION_VERSIONS = [
${versions.map((v) => `  "${v}",`).join("\n")}
] as const;
`;

writeFileSync(outFile, content);
console.log(`${versions.length} migratieversies weggeschreven naar ${outFile}`);
