"use client";

import { useActionState, useEffect, useRef, useState, type DragEvent } from "react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { FileText, Paperclip, Pencil, SquarePen, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FloatingPortal } from "@/components/ui/FloatingPortal";
import { IconButton } from "@/components/ui/IconButton";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { createPostAction, type CreatePostState } from "@/app/(app)/actions";
import { CARD_THUMBNAIL_DIMENSION, compressImageFile, createThumbnailFile } from "@/lib/image/compress";
import { MentionEditor } from "./MentionEditor";
import { PostTypeChooser } from "./PostTypeChooser";
import { POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedAuthor, FeedPost, FeedPostType } from "@/lib/feed/types";

const initialState: CreatePostState = {};

const TEXTAREA_MAX_HEIGHT = 220;

// "geen" is een bewuste keuze voor GEEN categorie ("Iets anders" in
// PostTypeChooser) — anders dan `undefined`, wat betekent dat er nog
// helemaal geen keuze gemaakt is (zie `chosen` hieronder). createPostAction
// herkent deze letterlijke waarde en slaat dan null op.
export const NO_POST_TYPE_VALUE = "geen";
type PostTypeChoice = FeedPostType | typeof NO_POST_TYPE_VALUE;

const COMPOSER_PLACEHOLDER: Record<PostTypeChoice, string> = {
  vraag: "Wat wil je weten?",
  aanbod: "Wat heb je aan te bieden?",
  nieuws: "Wat wil je delen?",
  voorstellen: "Vertel wie je bent en wat je doet…",
  overig: "Wat wil je delen met het netwerk?",
  geen: "Wat wil je delen met het netwerk?",
};
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_ATTACHMENTS = 10;

type Preview = { url: string; name: string; isImage: boolean };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Plaatsen…" : "Plaatsen"}
    </Button>
  );
}

/**
 * Wrapper that remounts the actual form (via `key`) after every successful
 * post, which is how the textarea/file input/local state get reset — rather
 * than resetting them by calling setState from an effect.
 */
export function PostComposer({
  author,
  onCreated,
  autoOpenIntro = false,
  autoOpen = false,
}: {
  author: FeedAuthor;
  onCreated: (post: FeedPost) => void;
  // Vanuit de introductiestap (?intro=1, zie FeedList) — opent de composer
  // direct met "Even voorstellen" gekozen, zonder PostTypeChooser-stap.
  // Alleen de EERSTE formulierinstantie (formKey 0) mag hierdoor openen:
  // anders zou een remount ná het annuleren of plaatsen van dit bericht
  // (hieronder, via setFormKey) zichzelf steeds opnieuw openen, want de
  // prop zelf verandert niet (die volgt de URL, niet of er al gesloten is).
  autoOpenIntro?: boolean;
  // Vanuit Home's "Bericht"-snelknop (?nieuw=1, zie FeedList) — opent de
  // composer direct, mét de PostTypeChooser-stap (geen type voorgekozen,
  // anders dan autoOpenIntro hierboven). Zonder dit ging die knop alleen
  // naar de feed, en moest je daar nog zelf op het opstelveld klikken.
  autoOpen?: boolean;
}) {
  const [formKey, setFormKey] = useState(0);

  return (
    <PostComposerForm
      key={formKey}
      author={author}
      autoOpenIntro={formKey === 0 && autoOpenIntro}
      autoOpen={formKey === 0 && autoOpen}
      onCreated={(post) => {
        onCreated(post);
        setFormKey((k) => k + 1);
      }}
      // Remount i.p.v. alleen setOpen(false): zo start de composer bij de
      // volgende keer openen altijd met een schone beginsituatie (geen
      // onthouden categoriekeuze, tekst of bijlagen) — zie opdracht "punt 4".
      onClose={() => setFormKey((k) => k + 1)}
    />
  );
}

function PostComposerForm({
  author,
  autoOpenIntro,
  autoOpen,
  onCreated,
  onClose,
}: {
  author: FeedAuthor;
  autoOpenIntro: boolean;
  autoOpen: boolean;
  onCreated: (post: FeedPost) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(autoOpenIntro || autoOpen);
  const [state, formAction] = useActionState(createPostAction, initialState);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  // undefined = nog geen keuze gemaakt (stap 1 wordt getoond) — zie
  // PostTypeChooser en NO_POST_TYPE_VALUE hierboven.
  const [chosen, setChosen] = useState<PostTypeChoice | undefined>(autoOpenIntro ? "voorstellen" : undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const formElRef = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  // Een achtergrond-klik/Escape sloot dit paneel tot nu toe stilletjes, met
  // verlies van al ingevulde tekst + bijlagen — alleen een bevestiging
  // vragen als er daadwerkelijk iets te verliezen is (anders zou een lege
  // composer sluiten onnodig een extra klik kosten).
  function hasUnsavedContent(): boolean {
    if (previews.length > 0) return true;
    const content = formElRef.current?.elements.namedItem("content");
    return content instanceof HTMLInputElement && content.value.trim().length > 0;
  }

  async function requestClose() {
    if (hasUnsavedContent()) {
      const confirmed = await confirm({
        title: "Bericht sluiten?",
        description: "Je ingevulde tekst en bijlagen gaan dan verloren.",
        confirmLabel: "Sluiten",
        cancelLabel: "Terug naar bericht",
        danger: true,
      });
      if (!confirmed) return;
    }
    onClose();
  }

  useEscapeKey(open, requestClose);
  useBodyScrollLock(open);

  useEffect(() => {
    if (state.success && state.post) {
      onCreated(state.post);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Object-URLs voor de miniatuurvoorbeelden horen bij dit component-leven,
  // niet bij React state zelf — zonder expliciet opruimen blijven ze na een
  // her-render of unmount in het geheugen hangen.
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function rebuildPreviews(files: File[]) {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const next = files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      isImage: file.type.startsWith("image/"),
    }));
    previewUrlsRef.current = next.map((p) => p.url);
    setPreviews(next);
  }

  // Eén lege placeholder-File per niet-afbeelding (PDF, of een thumbnail die
  // onverhoopt mislukte) i.p.v. die positie gewoon over te slaan — zonder dit
  // zou attachment_thumbs korter worden dan attachments zodra er een PDF
  // tussen de foto's in zit, en raakt de index-koppeling (createPostAction
  // matcht ze 1-op-1 op positie) stuk.
  async function buildThumbFileList(files: File[]): Promise<FileList> {
    const thumbs = await Promise.all(
      files.map(async (file) => {
        if (!file.type.startsWith("image/")) return new File([], "leeg");
        const thumb = await createThumbnailFile(file, CARD_THUMBNAIL_DIMENSION);
        return thumb ?? new File([], "leeg");
      })
    );
    const transfer = new DataTransfer();
    thumbs.forEach((f) => transfer.items.add(f));
    return transfer.files;
  }

  async function addFiles(newFiles: File[]) {
    const input = fileInputRef.current;
    if (!input) return;

    const existing = Array.from(input.files ?? []);
    const accepted = newFiles.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const combined = [...existing, ...accepted].slice(0, MAX_ATTACHMENTS);

    const compressed = await Promise.all(combined.map((f) => compressImageFile(f)));

    const transfer = new DataTransfer();
    compressed.forEach((f) => transfer.items.add(f));
    input.files = transfer.files;
    rebuildPreviews(compressed);

    if (thumbInputRef.current) {
      thumbInputRef.current.files = await buildThumbFileList(compressed);
    }
  }

  function removeFile(index: number) {
    const input = fileInputRef.current;
    if (!input) return;
    const remaining = Array.from(input.files ?? []).filter((_, i) => i !== index);
    const transfer = new DataTransfer();
    remaining.forEach((f) => transfer.items.add(f));
    input.files = transfer.files;
    rebuildPreviews(remaining);

    const thumbInput = thumbInputRef.current;
    if (thumbInput) {
      void buildThumbFileList(remaining).then((files) => {
        thumbInput.files = files;
      });
    }
  }

  function handleDragOver(e: DragEvent<HTMLFormElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLFormElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(false);
  }

  function handleDrop(e: DragEvent<HTMLFormElement>) {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    setDragActive(false);
    void addFiles(Array.from(e.dataTransfer.files));
  }

  // Compact veld i.p.v. het volledige formulier — pas bij klikken opent het
  // grotere, gedimde overlay eronder. Voorkomt dat de feed standaard met een
  // groot invoerformulier begint. Redesign-besluit 7: op mobiel vervangt een
  // rode zwevende knop rechtsonder dit opstelveld; op desktop blijft het
  // gewoon bovenaan de feed staan.
  if (!open) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-sm hover:border-foreground/20 sm:flex"
        >
          <Avatar firstName={author.first_name} lastName={author.last_name} avatarUrl={author.avatarUrl} size={36} />
          <span className="text-sm text-muted">Wat wil je delen met het netwerk?</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-30 flex h-[46px] items-center gap-2 rounded-full bg-voc-red pl-4 pr-5 text-sm font-semibold text-white shadow-lg hover:bg-voc-red-dark sm:hidden"
        >
          <SquarePen size={16} />
          Bericht
        </button>
      </>
    );
  }

  return (
    // FloatingPortal: zonder dit rendert dit paneel ter plekke in <main>, dat
    // vóór BottomNav in de DOM staat — bij gelijke z-index wint dan de later
    // gerenderde BottomNav de klik, waardoor die onder dit paneel aanklikbaar
    // bleef (zelfde bugklasse als bij NotificationCenter).
    <FloatingPortal>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/60 animate-fade-in" onClick={requestClose} />
      {/* Mobiel: paneel van onderen (zelfde patroon als ProfileMenu) i.p.v.
          een venster midden in het scherm — hoorde niet bij hoe de rest van
          de app zijn panelen op een telefoon toont. Vanaf sm weer het
          gecentreerde venster van ervoor. */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-0 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:w-full sm:max-w-xl sm:-translate-y-1/2 sm:px-3 md:left-72">
        <div className="animate-sheet-in sm:animate-scale-in max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg sm:rounded-2xl sm:pb-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{chosen === "voorstellen" ? "Stel jezelf voor" : "Nieuw bericht"}</p>
            <IconButton onClick={requestClose} aria-label="Sluiten">
              <X size={16} />
            </IconButton>
          </div>

          {chosen === undefined ? (
            <div className="p-4">
              <PostTypeChooser onChoose={setChosen} />
            </div>
          ) : (
            <form
              ref={formElRef}
              action={formAction}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={clsx("p-4", dragActive && "bg-petrol-soft")}
            >
              <input type="hidden" name="type" value={chosen} />
              {dragActive && (
                <p className="mb-2 text-center text-xs font-medium text-petrol">Zet bestanden hier neer om toe te voegen</p>
              )}

              <div className="mb-2 flex items-center gap-1.5 text-xs text-muted sm:ml-[52px]">
                {chosen === NO_POST_TYPE_VALUE ? "Geen categorie" : POST_TYPE_LABELS[chosen]}
                <button
                  type="button"
                  onClick={() => setChosen(undefined)}
                  className="flex items-center gap-1 font-medium text-voc-red-text hover:underline"
                >
                  <Pencil size={11} />
                  Wijzigen
                </button>
              </div>

              <div className="flex items-start gap-3">
                <Avatar firstName={author.first_name} lastName={author.last_name} avatarUrl={author.avatarUrl} size={40} />
                <MentionEditor
                  name="content"
                  placeholder={COMPOSER_PLACEHOLDER[chosen]}
                  minHeightClassName="min-h-24"
                  maxHeight={TEXTAREA_MAX_HEIGHT}
                  autoFocus
                />
              </div>

              {/* Meegestuurde, al client-side verkleinde (CARD_THUMBNAIL_DIMENSION)
                  versie per afbeelding, 1-op-1 op positie gekoppeld aan
                  `attachments` — zie buildThumbFileList hierboven en
                  createPostAction (actions.ts) voor hoe de index-matching werkt. */}
              <input ref={thumbInputRef} type="file" name="attachment_thumbs" multiple className="hidden" aria-hidden tabIndex={-1} />

              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:ml-[52px] sm:grid-cols-5">
                  {previews.map((preview, index) => (
                    <div key={preview.url} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
                      {preview.isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center">
                          <FileText size={18} className="text-voc-red-text" />
                          <span className="line-clamp-2 text-[10px] text-muted">{preview.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        aria-label="Verwijderen"
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {state.error && (
                <p role="alert" className="mt-2 rounded-lg bg-voc-red-light px-3 py-2 text-sm text-voc-red-text sm:ml-[52px]">
                  {state.error}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between sm:ml-[52px]">
                {/* Stijlronde: compact icoontje i.p.v. een hele dropzone-balk
                    — drag-and-drop op het formulier blijft werken
                    (handleDragOver/handleDrop hierboven), dit is alleen de
                    klikbare ingang. Een klein, subtiel wolkje bij hoveren
                    i.p.v. een opvallend info-blok. */}
                <div className="group/attach relative">
                  <IconButton onClick={() => fileInputRef.current?.click()} aria-label="Foto's of pdf toevoegen">
                    <Paperclip size={18} />
                  </IconButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="attachments"
                    multiple
                    accept={ACCEPTED_TYPES.join(",")}
                    className="sr-only"
                    onChange={(e) => {
                      void addFiles(Array.from(e.target.files ?? []));
                    }}
                  />
                  <span className="pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/attach:opacity-100">
                    Afbeeldingen en pdf
                  </span>
                </div>
                <SubmitButton />
              </div>
            </form>
          )}
        </div>
      </div>
    </FloatingPortal>
  );
}
