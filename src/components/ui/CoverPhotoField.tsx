"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { compressInputFile } from "@/lib/image/compress";

// Profielhero-herontwerp: gedeeld upload-veld voor de optionele coverfoto
// (bedrijf en lid allebei) — zelfde opzet als het avatar-veld in
// ProfileForm (compressInputFile vóór upload, voorbeeld direct zichtbaar),
// maar dan voor de brede banner i.p.v. een vierkant/rond icoon. Een apart
// verborgen `${name}_remove`-veld laat de server weten dat een bestaande
// coverfoto losgekoppeld moet worden zonder dat er een nieuw bestand bij zit
// (uploadImage/removePreviousImage ondersteunen zelf geen "leegmaken").
export function CoverPhotoField({ name, initialUrl }: { name: string; initialUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = removed ? null : (preview ?? initialUrl);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">Coverfoto</label>
      <div
        className="relative h-28 w-full overflow-hidden rounded-xl bg-gradient-to-br from-petrol-deep to-petrol bg-cover bg-center"
        style={current ? { backgroundImage: `url(${current})` } : undefined}
      >
        <label
          htmlFor={name}
          className="absolute right-2 top-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/55"
        >
          <Camera size={13} />
          {current ? "Wijzigen" : "Toevoegen"}
        </label>
        {current && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setRemoved(true);
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Coverfoto verwijderen"
            className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/55"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        id={name}
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={async (e) => {
          const compressed = await compressInputFile(e.target);
          if (!compressed) return;
          setRemoved(false);
          setPreview(URL.createObjectURL(compressed));
        }}
      />
      <input type="hidden" name={`${name}_remove`} value={removed ? "true" : "false"} />
      <p className="text-xs text-muted">Zonder coverfoto blijft de petrol-kleurbalk staan. Max. 5 MB.</p>
    </div>
  );
}
