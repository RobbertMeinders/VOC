// UX-review U5: foutregel direct onder het veld i.p.v. de browser's eigen
// (Engelse) validatieballon.
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-voc-red-text">
      {message}
    </p>
  );
}
