"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

export function CompanyFilters({ branches }: { branches: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  // Ref i.p.v. de searchParams uit de render-closure: de branche-select hieronder
  // past de URL synchroon aan (router.replace), maar de setTimeout hier is nog
  // 300ms onderweg met een oudere snapshot van searchParams — zonder deze ref
  // overschrijft die vertraagde timeout de net-gekozen branchefilter weer met de
  // verouderde staat zodra hij afgaat.
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current);
      if (query) params.set("q", query);
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleBranchChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("branche", value);
    else params.delete("branche");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op bedrijfsnaam of plaats…"
          aria-label="Zoek op bedrijfsnaam of plaats"
          className="pl-9"
        />
      </div>
      <select
        defaultValue={searchParams.get("branche") ?? ""}
        onChange={(e) => handleBranchChange(e.target.value)}
        className="h-10 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      >
        <option value="">Alle branches</option>
        {branches.map((branche) => (
          <option key={branche} value={branche}>
            {branche}
          </option>
        ))}
      </select>
    </div>
  );
}
