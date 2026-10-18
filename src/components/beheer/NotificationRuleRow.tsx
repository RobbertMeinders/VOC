"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { updateNotificationRuleAction } from "@/app/(app)/beheer/communicatie/notificatieregels-actions";
import { ASSIGNABLE_ROLES, NOTIFICATION_TYPE_LABELS, type ConfigurableNotificationType } from "@/lib/notifications/type-labels";
import type { Database, UserRole } from "@/lib/types/database";

type Settings = Database["public"]["Tables"]["notification_type_settings"]["Row"];

const ROLE_LABELS: Record<string, string> = { bestuurslid: "Bestuurslid", beheerder: "Beheerder" };

export function NotificationRuleRow({ type, initial, isRoleBased }: { type: ConfigurableNotificationType; initial: Settings; isRoleBased: boolean }) {
  const [settings, setSettings] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const info = NOTIFICATION_TYPE_LABELS[type];

  function apply(patch: {
    enabled?: boolean;
    channel_inapp?: boolean;
    channel_push?: boolean;
    channel_email?: boolean;
    roles?: UserRole[];
  }) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setError(null);
    startTransition(async () => {
      const result = await updateNotificationRuleAction(type, patch);
      if (result.error) {
        setError(result.error);
        setSettings(settings);
      }
    });
  }

  function toggleRole(role: UserRole) {
    const current = settings.roles ?? [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    apply({ roles: next });
  }

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{info.label}</p>
        <p className="text-xs text-muted">{type}</p>
        {error && <p className="mt-1 text-xs text-voc-red-text">{error}</p>}
      </td>
      <td className="px-4 py-3">
        {isRoleBased ? (
          <div className="flex flex-wrap gap-1.5">
            {ASSIGNABLE_ROLES.map((role) => {
              const active = (settings.roles ?? []).includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={pending || !settings.enabled}
                  onClick={() => toggleRole(role)}
                  className={
                    "rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-60 " +
                    (active
                      ? "border-voc-red bg-voc-red text-white"
                      : "border-border text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]")
                  }
                >
                  {ROLE_LABELS[role] ?? role}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-sm text-muted">{info.recipients}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-4">
          <label className="flex flex-col items-center gap-1 text-xs text-muted">
            In-app
            <Switch
              checked={settings.channel_inapp}
              onChange={() => apply({ channel_inapp: !settings.channel_inapp })}
              disabled={pending || !settings.enabled}
              label={`In-app voor ${info.label}`}
            />
          </label>
          <label className="flex flex-col items-center gap-1 text-xs text-muted">
            Push
            <Switch
              checked={settings.channel_push}
              onChange={() => apply({ channel_push: !settings.channel_push })}
              disabled={pending || !settings.enabled}
              label={`Push voor ${info.label}`}
            />
          </label>
          <label className="flex flex-col items-center gap-1 text-xs text-muted">
            E-mail
            <Switch
              checked={settings.channel_email}
              onChange={() => apply({ channel_email: !settings.channel_email })}
              disabled={pending || !settings.enabled}
              label={`E-mail voor ${info.label}`}
            />
          </label>
        </div>
      </td>
      <td className="px-4 py-3">
        <Switch
          checked={settings.enabled}
          onChange={() => apply({ enabled: !settings.enabled })}
          disabled={pending}
          label={`${info.label} aan/uit`}
        />
      </td>
    </tr>
  );
}
