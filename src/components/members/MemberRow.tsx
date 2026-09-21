import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type MemberListItem = {
  id: string;
  first_name: string;
  last_name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  company: { id: string; name: string; industry: string | null } | null;
};

export function MemberRow({ member }: { member: MemberListItem }) {
  return (
    <Link
      href={`/leden/${member.id}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm hover:border-voc-red"
    >
      <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={80} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {member.first_name} {member.last_name}
        </p>
        {member.jobTitle && <p className="mt-0.5 truncate text-xs text-muted">{member.jobTitle}</p>}
        {member.company && (
          <p className="mt-0.5 truncate text-xs text-muted">
            {member.company.name}
            {member.company.industry && <span> — {member.company.industry}</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
