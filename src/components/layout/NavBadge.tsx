export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-voc-red px-1.5 text-xs font-medium text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
