"use client";

import { useTransition } from "react";
import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { dismissIntroductionPromptAction } from "@/app/(app)/profiel/actions";

// Zelfde kleine, wegklikbare regel-stijl als ProfilePhotoPrompt (Home) —
// gebruikt op twee plekken: op Home (dismissible, verdwijnt na wegklikken
// of zodra de introductie geplaatst is) en op /profiel (dismissible={false},
// de plek waar een eerder overgeslagen introductie alsnog afgerond kan
// worden, net als de andere profielvelden daar). "/community?intro=1"
// opent de bestaande berichtcomposer al met het type "Even voorstellen"
// gekozen — zie FeedList/PostComposer — dus geen aparte invoerflow hier.
export function IntroductionPrompt({ dismissible = true }: { dismissible?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleDismiss() {
    startTransition(async () => {
      await dismissIntroductionPromptAction();
    });
  }

  return (
    <div className="animate-rise-in flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm">
      <Link href="/community?intro=1" className="flex min-w-0 items-center gap-2 text-foreground hover:text-voc-red-text">
        <UserPlus size={15} className="shrink-0 text-voc-red-text" />
        <span className="truncate">Stel jezelf voor aan de andere leden</span>
      </Link>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          aria-label="Wegklikken"
          className="shrink-0 rounded-full p-1 text-muted hover:bg-black/[.04] hover:text-foreground disabled:opacity-50 dark:hover:bg-white/[.08]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
