"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { RoleEditor } from "@/components/members/RoleEditor";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { updateMemberActiveAction, deleteMemberAction, generateLoginLinkAction } from "@/app/(app)/leden/[id]/actions";
import type { UserRole } from "@/lib/types/database";

// UX-review punt 11: 4 losse actieblokken (rol/actief/organisatieaccount/
// verwijderen) per rij werden op mobiel een lange verticale stapel.
// Hergebruikt het al bestaande ActionMenu-patroon (zie InvitationRow) i.p.v.
// een nieuw component te bouwen. "Rol wijzigen" heeft een waarde nodig (geen
// kale bevestiging), dus dat item klapt de bestaande RoleEditor-compact-vorm
// uit i.p.v. een eigen rol-kiezer te herbouwen.
export function MemberRowMenu({
  memberId,
  memberName,
  currentRole,
  isActive,
  canEditRole,
  isSelf,
}: {
  memberId: string;
  memberName: string;
  currentRole: UserRole;
  isActive: boolean;
  canEditRole: boolean;
  isSelf: boolean;
}) {
  const [editingRole, setEditingRole] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const confirm = useConfirm();
  const router = useRouter();

  function showFeedback(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback((current) => (current === message ? null : current)), 2500);
  }

  const items: ActionMenuItem[] = [];

  if (canEditRole) {
    items.push({ label: "Rol wijzigen", onClick: () => setEditingRole((v) => !v) });
  }

  if (!isSelf) {
    items.push({
      label: "Inloglink kopiëren",
      onClick: () => {
        startTransition(async () => {
          const result = await generateLoginLinkAction(memberId);
          if (result.error || !result.link) {
            showFeedback(result.error ?? "Inloglink genereren is niet gelukt.");
            return;
          }
          try {
            await navigator.clipboard.writeText(result.link);
            showFeedback("Inloglink gekopieerd.");
          } catch {
            showFeedback("Link gemaakt, maar kopiëren is niet gelukt.");
          }
        });
      },
    });

    items.push({
      label: isActive ? "Deactiveren" : "Activeren",
      danger: isActive,
      onClick: async () => {
        if (isActive) {
          const confirmed = await confirm({
            title: "Lid deactiveren?",
            description:
              "Het account is dan direct niet meer bruikbaar en verdwijnt uit de ledenlijst. " +
              "Persoonsgegevens (naam, e-mail, telefoon, foto, functie, bio) worden na 90 dagen automatisch " +
              "verwijderd, tenzij het lid binnen die termijn weer geactiveerd wordt. " +
              'Geplaatste berichten en reacties blijven staan, wel voortaan onder "Verwijderd lid".',
            confirmLabel: "Deactiveren",
            danger: true,
          });
          if (!confirmed) return;
        }
        startTransition(async () => {
          const result = await updateMemberActiveAction(memberId, !isActive);
          if (result.error) showFeedback(result.error);
          else router.refresh();
        });
      },
    });
  }

  if (canEditRole && !isSelf) {
    items.push({
      label: "Verwijderen",
      danger: true,
      onClick: async () => {
        const confirmed = await confirm({
          title: "Lid verwijderen?",
          description:
            `${memberName} wordt direct uitgelogd en ontkoppeld van het eigen bedrijf, en verdwijnt uit de ledenlijst. ` +
            'Persoonsgegevens (naam, e-mail, telefoon, foto, functie, bio) worden meteen gewist. Geplaatste berichten ' +
            'en reacties blijven staan, wel voortaan onder "Verwijderd lid". Dit kan niet ongedaan worden gemaakt.',
          confirmLabel: "Verwijderen",
          danger: true,
        });
        if (!confirmed) return;
        startTransition(async () => {
          const result = await deleteMemberAction(memberId);
          if (result.error) showFeedback(result.error);
          else router.refresh();
        });
      },
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ActionMenu items={items} />
      {feedback && <p className="text-xs text-muted">{feedback}</p>}
      {editingRole && (
        <div className="w-full min-w-[160px]">
          <RoleEditor memberId={memberId} currentRole={currentRole} compact />
        </div>
      )}
    </div>
  );
}
