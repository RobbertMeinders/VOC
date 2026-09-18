import { Avatar } from "@/components/ui/Avatar";

export type FeedPost = {
  id: string;
  content: string | null;
  created_at: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar
          firstName={post.author.first_name}
          lastName={post.author.last_name}
          avatarUrl={post.author.avatar_url}
          size={40}
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {post.author.first_name} {post.author.last_name}
          </p>
          <p className="text-xs text-muted">{formatDate(post.created_at)}</p>
        </div>
      </div>
      {post.content && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>}
    </article>
  );
}
