"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { useToast } from "@/lib/ui/ToastContext";
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
  setContactOptedOutAction,
  createListAction,
  renameListAction,
  deleteListAction,
  addProfileToListAction,
  removeProfileFromListAction,
  addContactToListAction,
  removeContactFromListAction,
} from "@/app/(app)/beheer/contacten/actions";
import type { Database } from "@/lib/types/database";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactList = Database["public"]["Tables"]["contact_lists"]["Row"];
type Profile = { id: string; first_name: string; last_name: string };

function profileName(p: Profile): string {
  return `${p.first_name} ${p.last_name}`.trim();
}

function ContactEditRow({ contact, onDone }: { contact: Contact; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email);
  const [company, setCompany] = useState(contact.company ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    const result = await updateContactAction(contact.id, name, email, company);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border py-2 last:border-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="flex-1" />
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@bedrijf.nl" className="flex-1" />
        <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Bedrijf (optioneel)" className="flex-1" />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleSave} disabled={pending || !name.trim() || !email.trim()}>
            Opslaan
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onDone} disabled={pending}>
            Annuleren
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-voc-red-text">{error}</p>}
    </div>
  );
}

function ContactsSection({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await createContactAction(name, email, company);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setEmail("");
    setCompany("");
    toast("Contact toegevoegd.");
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-foreground">Contactpersonen</p>
      <p className="mt-0.5 text-sm text-muted">Mensen zonder account die je toch via de nieuwsbrief wilt bereiken.</p>

      <div className="mt-3 flex flex-col gap-2">
        {contacts.length === 0 && <p className="text-sm text-muted">Nog geen contactpersonen.</p>}
        {contacts.map((contact) => {
          if (editingId === contact.id) {
            return <ContactEditRow key={contact.id} contact={contact} onDone={() => setEditingId(null)} />;
          }

          const items: ActionMenuItem[] = [
            { label: "Bewerken", onClick: () => setEditingId(contact.id) },
            {
              label: contact.opted_out ? "Weer aanmelden" : "Afmelden",
              onClick: async () => {
                await setContactOptedOutAction(contact.id, !contact.opted_out);
                router.refresh();
              },
            },
            {
              label: "Verwijderen",
              danger: true,
              onClick: async () => {
                const confirmed = await confirm({
                  title: "Contact verwijderen?",
                  description: `"${contact.name}" wordt ook uit alle lijsten verwijderd.`,
                  confirmLabel: "Verwijderen",
                  danger: true,
                });
                if (!confirmed) return;
                await deleteContactAction(contact.id);
                router.refresh();
              },
            },
          ];
          return (
            <div key={contact.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {contact.name}
                  {contact.opted_out && <span className="ml-1.5 text-xs font-normal text-muted">(afgemeld)</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {contact.email}
                  {contact.company && ` · ${contact.company}`}
                </p>
              </div>
              <ActionMenu items={items} />
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Naam</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">E-mailadres</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@bedrijf.nl" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Bedrijf (optioneel)</label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Bedrijf" />
        </div>
        <Button type="button" onClick={handleAdd} disabled={pending || !name.trim() || !email.trim()}>
          <Plus size={16} />
          Toevoegen
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-voc-red-text">{error}</p>}
    </div>
  );
}

function ListCard({
  list,
  memberProfiles,
  memberContacts,
  allContacts,
  allProfiles,
}: {
  list: ContactList;
  memberProfiles: Profile[];
  memberContacts: Contact[];
  allContacts: Contact[];
  allProfiles: Profile[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [addProfileId, setAddProfileId] = useState("");
  const [addContactId, setAddContactId] = useState("");

  const availableProfiles = allProfiles.filter((p) => !memberProfiles.some((m) => m.id === p.id));
  const availableContacts = allContacts.filter((c) => !memberContacts.some((m) => m.id === c.id));

  async function handleRename() {
    setRenamePending(true);
    setRenameError(null);
    const result = await renameListAction(list.id, name, description);
    setRenamePending(false);
    if (result.error) {
      setRenameError(result.error);
      return;
    }
    router.refresh();
    setRenaming(false);
  }

  const items: ActionMenuItem[] = [
    { label: "Hernoemen", onClick: () => setRenaming(true) },
    {
      label: "Verwijderen",
      danger: true,
      onClick: async () => {
        const confirmed = await confirm({
          title: "Lijst verwijderen?",
          description: `"${list.name}" wordt verwijderd. Campagnes die deze lijst al gebruikten blijven ongewijzigd.`,
          confirmLabel: "Verwijderen",
          danger: true,
        });
        if (!confirmed) return;
        await deleteListAction(list.id);
        router.refresh();
      },
    },
  ];

  if (renaming) {
    return (
      <div className="rounded-xl border border-border p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="flex-1" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Omschrijving (optioneel)" className="flex-1" />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleRename} disabled={renamePending || !name.trim()}>
              Opslaan
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRenaming(false)} disabled={renamePending}>
              Annuleren
            </Button>
          </div>
        </div>
        {renameError && <p className="mt-2 text-sm text-voc-red-text">{renameError}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between gap-3 p-3">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown size={16} className={clsx("shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{list.name}</p>
            <p className="truncate text-xs text-muted">
              {memberProfiles.length + memberContacts.length} ontvanger{memberProfiles.length + memberContacts.length === 1 ? "" : "s"}
              {list.description && ` · ${list.description}`}
            </p>
          </div>
        </button>
        <ActionMenu items={items} />
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {memberProfiles.map((p) => (
              <span key={p.id} className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-foreground dark:bg-white/[.08]">
                {profileName(p)}
                <button
                  type="button"
                  onClick={async () => {
                    await removeProfileFromListAction(list.id, p.id);
                    router.refresh();
                  }}
                  aria-label={`${profileName(p)} verwijderen uit lijst`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {memberContacts.map((c) => (
              <span key={c.id} className="flex items-center gap-1 rounded-full bg-black/[.06] px-2.5 py-1 text-xs text-foreground dark:bg-white/[.08]">
                {c.name}
                <button
                  type="button"
                  onClick={async () => {
                    await removeContactFromListAction(list.id, c.id);
                    router.refresh();
                  }}
                  aria-label={`${c.name} verwijderen uit lijst`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {memberProfiles.length === 0 && memberContacts.length === 0 && (
              <p className="text-sm text-muted">Nog geen leden in deze lijst.</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
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
                onClick={async () => {
                  await addProfileToListAction(list.id, addProfileId);
                  setAddProfileId("");
                  router.refresh();
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
                onClick={async () => {
                  await addContactToListAction(list.id, addContactId);
                  setAddContactId("");
                  router.refresh();
                }}
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListsSection({
  lists,
  listProfiles,
  listContacts,
  activeProfiles,
  contacts,
}: {
  lists: ContactList[];
  listProfiles: { list_id: string; profile_id: string }[];
  listContacts: { list_id: string; contact_id: string }[];
  activeProfiles: Profile[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await createListAction(name, description);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setDescription("");
    toast("Lijst aangemaakt.");
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-foreground">Lijsten</p>
      <p className="mt-0.5 text-sm text-muted">Herbruikbare groepen leden en contactpersonen, te kiezen als doelgroep op een campagne.</p>

      <div className="mt-3 flex flex-col gap-2">
        {lists.length === 0 && <p className="text-sm text-muted">Nog geen lijsten.</p>}
        {lists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            memberProfiles={activeProfiles.filter((p) => listProfiles.some((lp) => lp.list_id === list.id && lp.profile_id === p.id))}
            memberContacts={contacts.filter((c) => listContacts.some((lc) => lc.list_id === list.id && lc.contact_id === c.id))}
            allContacts={contacts}
            allProfiles={activeProfiles}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Naam</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Bestuur, Nieuwe leden 2026" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Omschrijving (optioneel)</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Omschrijving" />
        </div>
        <Button type="button" onClick={handleAdd} disabled={pending || !name.trim()}>
          <Plus size={16} />
          Lijst aanmaken
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-voc-red-text">{error}</p>}
    </div>
  );
}

export function ContactenContent({
  activeTab,
  contacts,
  lists,
  listProfiles,
  listContacts,
  activeProfiles,
}: {
  activeTab: "contacten" | "lijsten";
  contacts: Contact[];
  lists: ContactList[];
  listProfiles: { list_id: string; profile_id: string }[];
  listContacts: { list_id: string; contact_id: string }[];
  activeProfiles: Profile[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {activeTab === "contacten" && <ContactsSection contacts={contacts} />}
      {activeTab === "lijsten" && (
        <ListsSection lists={lists} listProfiles={listProfiles} listContacts={listContacts} activeProfiles={activeProfiles} contacts={contacts} />
      )}
    </div>
  );
}
