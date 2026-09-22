"use client";

import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { updateAttendedActivitiesVisibilityAction } from "@/app/(app)/profiel/actions";

export function AttendedActivitiesToggle({ initialVisible }: { initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !visible;
    setVisible(next);
    startTransition(async () => {
      const result = await updateAttendedActivitiesVisibilityAction(next);
      if (result.error) setVisible(!next);
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      disabled={isPending}
      onClick={toggle}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
        visible ? "bg-voc-red" : "bg-black/[.12] dark:bg-white/[.16]"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          visible ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
