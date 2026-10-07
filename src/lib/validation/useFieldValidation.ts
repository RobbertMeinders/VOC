"use client";

import { useCallback, useState } from "react";

export type FieldValidators = Record<string, (value: string) => string | undefined>;

// UX-review U5: validatie in de app i.p.v. de browser's eigen bubble.
// validateAll draait vóór het versturen (zie onSubmit in de formulieren)
// en blokkeert de server action zodra er iets niet klopt; validateField
// geeft al tijdens het typen/wegklikken (onBlur) directe feedback.
export function useFieldValidation(validators: FieldValidators) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (name: string, value: string) => {
      const validator = validators[name];
      if (!validator) return;
      const message = validator(value);
      setErrors((prev) => {
        if (!message) {
          if (!(name in prev)) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        }
        return { ...prev, [name]: message };
      });
    },
    [validators]
  );

  const validateAll = useCallback(
    (formData: FormData): boolean => {
      const nextErrors: Record<string, string> = {};
      for (const [name, validator] of Object.entries(validators)) {
        const message = validator(String(formData.get(name) ?? ""));
        if (message) nextErrors[name] = message;
      }
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [validators]
  );

  return { errors, validateField, validateAll };
}
