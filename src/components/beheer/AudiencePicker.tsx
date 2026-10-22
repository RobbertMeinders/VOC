"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { updateCommunicationAudienceAction } from "@/app/(app)/beheer/communicatie/actions";
import { createContactAction } from "@/app/(app)/beheer/contacten/actions";

type Profile = { id: string; first_name: string; last_name: string };
type Contact = { id: string; name: string; email: string };
type ContactListOption = { id: string; name: string };

function profileName(p: Profile): string {
  return `${p.first_name} ${p.last_name}`.trim();
}

// Doelgroep-kaart op de nieuwsbriefcampagne zelf (0089_newsletter_audience_
// targeting.sql): altijd bewerkbaar, ook als de campagne al (deels)
// verstuurd is — in tegenstelling tot onderwerp/inhoud, die op slot gaan
// zodra readOnly waar is. "Specifieke lijst(en)" vervangt "alle actieve
// leden" als hoofddoelgroep; de losse extra ontvangers hieronder gelden
// altijd bovenop welk hoofdfilter dan ook (zie claim_newsletter_deliveries)
// en zijn tegelijk het hele "nasturen naar één nieuw/extern persoon"- en
// "simpelweg testen"-mechanisme.
export function AudiencePicker({
  communicationId,
  recipientFilter: initialFilter,
  lists,
  selectedListIds: initialListIds,
  activeProfiles,
  contacts: initialContacts,
  extraProfileIds: initialExtraProfileIds,
  extraContactIds: initialExtraContactIds,
}: {
  communicationId: string;
  recipientFilter: string;
  lists: ContactListOption[];
  selectedListIds: string[];
  activeProfiles: Profile[];
  contacts: Contact[];
  extraProfileIds: string[];
  extraContactIds: string[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"alle_actieve_leden" | "lijsten" | "iedereen" | "niet_leden">(
    initialFilter === "lijsten" || initialFilter === "iedereen" || initialFilter === "niet_leden"
      ? initialFilter
      : "alle_actieve_leden"
  );
  const [listIds, setListIds] = useState<string[]>(initialListIds);
  const [extraProfileIds, setExtraProfileIds] = useState<string[]>(initialExtraProfileIds);
  const [extraContactIds, setExtraContactIds] = useState<string[]>(initialExtraContactIds);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  const [addProfileId, setAddProfileId] = useState("");
  const [addContactId, setAddContactId] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPending, setNewContactPending] = useState(false);
  const [newContactError, setNewContactError] = useState<string | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Live gevonden: de doelgroep moest eerst expliciet opgeslagen worden
  // (los van de rest van de pagina), maar "Versturen" bleef gewoon
  // klikbaar zonder die opslag -- een bestuurslid kon zo onopgemerkt naar
  // de oude/verkeerde doelgroep versturen. Nu wordt elke wijziging hier
  // automatisch (gedebounced) opgeslagen, zodat er nooit meer een
  // "aangevinkt maar niet opgeslagen"-toestand bestaat. skipFirstRun
  // voorkomt dat de net-vanaf-de-server geladen beginwaarden zichzelf
  // meteen opnieuw opslaan.
  const skipFirstRun = useRef(true);
  useEffect(() => {
    if (skipFirstRun.current) {
      skipFirstRun.current = false;
      return;
    }
    setSaving(true);
    setSaveError(null);
    const timeoutId = setTimeout(async () => {
      const result = await updateCommunicationAudienceAction(communicationId, filter, listIds, extraProfileIds, extraContactIds);
      setSaving(false);
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      router.refresh();
    }, 600);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, listIds, extraProfileIds, extraContactIds]);

  const extraProfiles = activeProfiles.filter((p) => extraProfileIds.includes(p.id));
  const extraContacts = contacts.filter((c) => extraContactIds.includes(c.id));
  const availableProfiles = activeProfiles.filter((p) => !extraProfileIds.includes(p.id));
  const availableContacts = contacts.filter((c) => !extraContactIds.includes(c.id));

  function toggleList(listId: string) {
    setListIds((prev) => (prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]));
  }

  async function handleAddNewContact() {
    setNewContactPending(true);
    setNewContactError(null);
    const result = await createContactAction(newContactName, newContactEmail);
    setNewContactPending(false);
    if (result.error || !result.contact) {
      setNewContactError(result.error ?? "Toevoegen is niet gelukt.");
      return;
    }
    setContacts((prev) => [...prev, { id: result.contact!.id, name: result.contact!.name, email: result.contact!.email }]);
    setExtraContactIds((prev) => [...prev, result.contact!.id]);
    setNewContactName("");
    setNewContactEmail("");
    setShowNewContact(false);
  }

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-foreground">Doelgroep</p>
      <p className="mt-0.5 text-sm text-muted">
        Hoofddoelgroep plus eventueel losse extra ontvangers. Handig om na te sturen naar iemand die nog niets ontving, of om zelf te
        testen.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="radio" checked={filter === "alle_actieve_leden"} onChange={() => setFilter("alle_actieve_leden")} />
          Alle actieve leden
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="radio" checked={filter === "iedereen"} onChange={() => setFilter("iedereen")} />
          Iedereen (leden + contacten)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="radio" checked={filter === "niet_leden"} onChange={() => setFilter("niet_leden")} />
          Niet-leden (alleen contacten)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="radio" checked={filter === "lijsten"} onChange={() => setFilter("lijsten")} />
          Specifieke lijst(en)
        </label>
        {filter === "lijsten" && (
          <div className="ml-6 flex flex-col gap-1.5">
            {lists.length === 0 && (
              <p className="text-sm text-muted">
                Nog geen lijsten.{" "}
                <Link href="/beheer/contacten?tab=lijsten" className="text-petrol hover:underline">
                  Lijst aanmaken
                </Link>
                .
              </p>
            )}
            {lists.map((list) => (
              <label key={list.id} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={listIds.includes(list.id)} onChange={() => toggleList(list.id)} className="rounded" />
                {list.name}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">Extra ontvangers</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {extraProfiles.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-foreground dark:bg-white/[.08]"
            >
              {profileName(p)}
              <button type="button" onClick={() => setExtraProfileIds((prev) => prev.filter((id) => id !== p.id))} aria-label={`${profileName(p)} verwijderen`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {extraContacts.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-foreground dark:bg-white/[.08]"
            >
              {c.name}
              <button type="button" onClick={() => setExtraContactIds((prev) => prev.filter((id) => id !== c.id))} aria-label={`${c.name} verwijderen`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {extraProfiles.length === 0 && extraContacts.length === 0 && <p className="text-sm text-muted">Geen extra ontvangers.</p>}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2">
            <Select value={addProfileId} onChange={(e) => setAddProfileId(e.target.value)} className="h-9 flex-1 pl-3">
              <option value="">Lid toevoegen…</option>
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {profileName(p)}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!addProfileId}
              onClick={() => {
                setExtraProfileIds((prev) => [...prev, addProfileId]);
                setAddProfileId("");
              }}
            >
              <Plus size={14} />
            </Button>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Select value={addContactId} onChange={(e) => setAddContactId(e.target.value)} className="h-9 flex-1 pl-3">
              <option value="">Contact toevoegen…</option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!addContactId}
              onClick={() => {
                setExtraContactIds((prev) => [...prev, addContactId]);
                setAddContactId("");
              }}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {!showNewContact ? (
          <button type="button" onClick={() => setShowNewContact(true)} className="mt-2 text-sm text-voc-red-text hover:underline">
            + Nieuw contact toevoegen (zonder account)
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">Naam</label>
              <Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Naam" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">E-mailadres</label>
              <Input type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="naam@bedrijf.nl" />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddNewContact}
              disabled={newContactPending || !newContactName.trim() || !newContactEmail.trim()}
            >
              Toevoegen
            </Button>
          </div>
        )}
        {newContactError && <p className="mt-1 text-sm text-danger-text">{newContactError}</p>}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs text-muted">{saving ? "Bezig met opslaan…" : "Wijzigingen worden automatisch opgeslagen."}</p>
        {saveError && <p className="mt-1 text-sm text-danger-text">{saveError}</p>}
      </div>
    </div>
  );
}
