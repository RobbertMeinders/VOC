"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerPublicForActivityAction, type PublicRegisterState } from "@/app/embed/agenda/actions";

const initialState: PublicRegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-voc-red px-4 py-2.5 text-sm font-medium text-white hover:bg-voc-red/90 disabled:opacity-60"
    >
      {pending ? "Bezig…" : "Aanmelden"}
    </button>
  );
}

export function PublicRegistrationForm({ activityId }: { activityId: string }) {
  const boundAction = registerPublicForActivityAction.bind(null, activityId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (state.success) {
    return (
      <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Bedankt voor je aanmelding! Tot dan.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-[#17171a]">
          Naam
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-lg border border-[#e5e5ea] bg-white px-3 py-2 text-sm text-[#17171a] placeholder:text-[#6b6b72] focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[#17171a]">
          E-mailadres
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-lg border border-[#e5e5ea] bg-white px-3 py-2 text-sm text-[#17171a] placeholder:text-[#6b6b72] focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="company_name" className="text-sm font-medium text-[#17171a]">
          Bedrijfsnaam (optioneel)
        </label>
        <input
          id="company_name"
          name="company_name"
          className="rounded-lg border border-[#e5e5ea] bg-white px-3 py-2 text-sm text-[#17171a] placeholder:text-[#6b6b72] focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-[#fdeaec] px-3 py-2 text-sm text-voc-red">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
