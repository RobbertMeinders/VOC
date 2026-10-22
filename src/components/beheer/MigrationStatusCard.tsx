import { Card } from "@/components/ui/Card";

// Vangnet (schema_migration_log, migratie 0189): toont welke migraties in
// de gedeployde code staan (MIGRATION_VERSIONS, gegenereerd vanuit
// supabase/migrations/*.sql) maar nog niet op deze database zijn gedraaid
// (get_applied_migration_versions()) -- precies de klasse fout die deze
// sessie herhaald live liet stranden (slug-URL's, cover-kolom-grant,
// profiel-opslaan-RPC).
export function MigrationStatusCard({ pending }: { pending: string[] }) {
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-foreground">Migraties</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-muted">Alle migraties uit de code staan ook op deze database.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            Deze migraties staan in de code maar zijn nog niet op deze database gedraaid. Draai ze (in volgorde) via de Supabase SQL-editor.
          </p>
          <ul className="flex flex-col gap-1">
            {pending.map((version) => (
              <li key={version} className="rounded-lg bg-status-warning-soft px-3 py-1.5 text-xs font-medium text-status-warning">
                {version}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
