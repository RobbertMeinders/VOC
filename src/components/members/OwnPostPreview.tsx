import Link from "next/link";
import Image from "next/image";
import { FileText } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format/date";
import { POST_TYPE_BADGE_CLASS, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedPost } from "@/lib/feed/types";

// UX-review feedback-ronde 2 punt 10: op het eigen profiel toonde elk
// eigen bericht de volle PostCard, inclusief 'vind ik leuk' en reageren —
// maar die interactie hoort bij de feed zelf, niet bij een overzichtje op
// je eigen profiel. Dit is bewust een kale, niet-interactieve preview:
// het hele kaartje is één link naar het echte bericht in de feed
// (/community?highlight=<id>, zelfde patroon als elders al gebruikt),
// waar vind-ik-leuk/reageren/bewerken/verwijderen gewoon werken.
export function OwnPostPreview({ post }: { post: FeedPost }) {
  const firstImage = post.attachments.find((a) => a.type === "image" && a.url);
  const summaryParts: string[] = [];
  if (post.likesCount > 0) summaryParts.push(`${post.likesCount} vind-ik-leuk`);
  if (post.comments.length > 0) {
    summaryParts.push(`${post.comments.length} ${post.comments.length === 1 ? "reactie" : "reacties"}`);
  }

  return (
    <Link href={`/community?highlight=${post.id}`} className="block">
      <article className="card-surface card-hover-lift p-3">
        <div className="flex items-center gap-3">
          <Avatar
            firstName={post.author.first_name}
            lastName={post.author.last_name}
            avatarUrl={post.author.avatarUrl}
            size={32}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {post.author.first_name} {post.author.last_name}
            </p>
            <p className="text-xs text-muted">{formatRelativeTime(post.createdAt)}</p>
          </div>
        </div>

        {post.type && (
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${POST_TYPE_BADGE_CLASS[post.type]}`}>
            {POST_TYPE_LABELS[post.type]}
          </span>
        )}
        {post.content && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-foreground">{post.content}</p>}

        {firstImage && (
          <div className="relative mt-3 h-40 w-full overflow-hidden rounded-xl">
            <Image src={firstImage.url!} alt="" fill sizes="(min-width: 640px) 600px, 100vw" className="object-cover" />
          </div>
        )}
        {!firstImage && post.attachments.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <FileText size={16} />
            {post.attachments.length === 1 ? "1 bijlage" : `${post.attachments.length} bijlagen`}
          </p>
        )}

        {summaryParts.length > 0 && <p className="mt-2 text-xs text-muted">{summaryParts.join(" · ")}</p>}
      </article>
    </Link>
  );
}
