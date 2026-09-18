import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type MemberListItem = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  avatarUrl: string | null;
  company: { id: string; name: string } | null;
};

export function MemberRow({ member }: { member: MemberListItem }) {
  return (
    <Link
      href={`/leden/${member.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm hover:border-voc-red"
    >
      <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={40} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {member.first_name} {member.last_name}
        </p>
        <p className="truncate text-xs text-muted">
          {member.job_title && <span>{member.job_title}</span>}
          {member.job_title && member.company && <span> — </span>}
          {member.company && <span>{member.company.name}</span>}
        </p>
      </div>
    </Link>
  );
}
