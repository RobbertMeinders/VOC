// UX-review U5: foutregel direct onder het veld i.p.v. de browser's eigen
// (Engelse) validatieballon. `id` is optioneel: geef 'm door en koppel 'm
// aan het veld zelf via `aria-describedby={id}` zodat een schermlezer de
// foutmelding ook voorleest zodra het veld focus krijgt, niet alleen op het
// moment dat de melding verschijnt (role="alert" dekt alleen dat laatste).
export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger-text">
      {message}
    </p>
  );
}
