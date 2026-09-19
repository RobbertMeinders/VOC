import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type MemberListItem = {
  id: string;
  first_name: string;
  last_name: string;
  avatarUrl: string | null;
  company: { id: string; name: string } | null;
};

export function MemberRow({ member }: { member: MemberListItem }) {
  return (
    <Link
      href={`/leden/${member.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red"
    >
      <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={48} />
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-foreground">
          {member.first_name} {member.last_name}
        </p>
        {member.company && <p className="truncate text-sm text-muted">{member.company.name}</p>}
      </div>
    </Link>
  );
}
