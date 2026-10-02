"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { compressInputFile } from "@/lib/image/compress";
import { createNewsItemAction, updateNewsItemAction, type NewsFormState } from "@/app/(app)/beheer/nieuws/actions";
import type { Database } from "@/lib/types/database";

type NewsItem = Database["public"]["Tables"]["news_items"]["Row"];

const initialState: NewsFormState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function NewsItemForm({
  item,
  imageUrl,
  onDone,
}: {
  item?: NewsItem;
  imageUrl?: string | null;
  onDone?: () => void;
}) {
  const action = item ? updateNewsItemAction.bind(null, item.id) : createNewsItemAction;
  const [state, formAction] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const shownImage = preview ?? imageUrl;

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onDone?.();
      }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
    >
      <Input name="title" placeholder="Titel" defaultValue={item?.title} required />
      <Input name="subtitle" placeholder="Pre-header (korte samenvatting, optioneel)" defaultValue={item?.subtitle ?? ""} />
      <textarea
        name="body"
        rows={5}
        placeholder="Tekst"
        defaultValue={item?.body}
        required
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`news-image-${item?.id ?? "new"}`} className="text-sm font-medium text-foreground">
          Foto (optioneel)
        </label>
        {shownImage && (
          <Image src={shownImage} alt="" width={160} height={100} className="h-[100px] w-[160px] rounded-lg object-cover" />
        )}
        <input
          id={`news-image-${item?.id ?? "new"}`}
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const input = e.target;
            const compressed = await compressInputFile(input);
            if (compressed) setPreview(URL.createObjectURL(compressed));
          }}
          className="text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-voc-red-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-voc-red hover:file:bg-voc-red/20"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      {state.success && !item && <p className="text-sm text-green-600">Geplaatst.</p>}

      <div className="flex items-center gap-2">
        <SubmitButton label={item ? "Opslaan" : "Plaatsen"} pendingLabel={item ? "Opslaan…" : "Plaatsen…"} />
        {onDone && (
          <button type="button" onClick={onDone} className="text-sm text-muted hover:underline">
            Annuleren
          </button>
        )}
      </div>
    </form>
  );
}
