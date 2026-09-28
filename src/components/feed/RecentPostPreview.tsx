import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { POST_TYPE_BADGE_CLASS, POST_TYPE_LABELS } from "@/lib/feed/postType";
import { formatRelativeTime } from "@/lib/format/date";
import type { FeedPost } from "@/lib/feed/types";

// Beknopte, alleen-lezen weergave van een bericht op het dashboard — geen
// like-/reactieknoppen (dat hoort bij de echte feed), tikken opent het volle
// bericht via dezelfde ?highlight=<id>-aanpak als notificatie-links.
export function RecentPostPreview({ post }: { post: FeedPost }) {
  const image = post.attachments.find((a) => a.type === "image" && a.url);

  return (
    <Link
      href={`/community?highlight=${post.id}`}
      className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:border-voc-red hover:shadow-md"
    >
      <Avatar
        firstName={post.author.first_name}
        lastName={post.author.last_name}
        avatarUrl={post.author.avatarUrl}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {post.author.first_name} {post.author.last_name}
          </p>
          <span className="text-xs text-muted">· {formatRelativeTime(post.createdAt)}</span>
          {post.type && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${POST_TYPE_BADGE_CLASS[post.type]}`}>
              {POST_TYPE_LABELS[post.type]}
            </span>
          )}
        </div>
        {post.content && <ExpandableText text={post.content} className="mt-1" lines={2} mentions />}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Heart size={14} />
            {post.likesCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={14} />
            {post.comments.length}
          </span>
        </div>
      </div>
      {image?.url && (
        <Image
          src={image.url}
          alt={image.fileName}
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      )}
    </Link>
  );
}
