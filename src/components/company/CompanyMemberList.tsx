import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

export type CompanyMember = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  avatarUrl: string | null;
};

export function CompanyMemberList({ members }: { members: CompanyMember[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-muted">Nog geen leden gekoppeld aan dit bedrijf.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {members.map((member) => (
        <Link
          key={member.id}
          href={`/leden/${member.id}`}
          className="flex items-center gap-3 py-3 hover:opacity-80"
        >
          <Avatar firstName={member.first_name} lastName={member.last_name} avatarUrl={member.avatarUrl} size={36} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {member.first_name} {member.last_name}
            </p>
            {member.job_title && <p className="text-xs text-muted">{member.job_title}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
