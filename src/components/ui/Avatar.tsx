import Image from "next/image";
import { clsx } from "clsx";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 40,
  className,
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        width={size}
        height={size}
        className={clsx("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-voc-red-light font-semibold text-voc-red",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
