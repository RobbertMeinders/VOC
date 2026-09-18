"use client";

import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "./LikeButton";
import { CommentForm } from "./CommentForm";
import { DeleteButton } from "./DeleteButton";
import { deleteCommentAction, deletePostAction } from "@/app/(app)/actions";
import type { FeedPost } from "@/lib/feed/types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PostCard({
  post,
  currentUserId,
  canModerate,
  onDeleted,
  onCommentDeleted,
}: {
  post: FeedPost;
  currentUserId: string;
  canModerate: boolean;
  onDeleted: (postId: string) => void;
  onCommentDeleted: (commentId: string) => void;
}) {
  const canDeletePost = canModerate || post.author.id === currentUserId;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leden/${post.author.id}`} className="flex items-center gap-3">
          <Avatar firstName={post.author.first_name} lastName={post.author.last_name} avatarUrl={post.author.avatarUrl} size={40} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.author.first_name} {post.author.last_name}
            </p>
            <p className="text-xs text-muted">{formatDate(post.createdAt)}</p>
          </div>
        </Link>
        {canDeletePost && (
          <DeleteButton
            confirmMessage="Weet je zeker dat je dit bericht wilt verwijderen?"
            onDelete={async () => {
              await deletePostAction(post.id);
              onDeleted(post.id);
            }}
          />
        )}
      </div>

      {post.content && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>}

      {post.attachments.map((attachment) =>
        attachment.type === "image" && attachment.url ? (
          <Image
            key={attachment.id}
            src={attachment.url}
            alt={attachment.fileName}
            width={600}
            height={400}
            className="mt-3 max-h-[420px] w-full rounded-xl object-cover"
          />
        ) : attachment.url ? (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-voc-red"
          >
            <FileText size={16} className="text-voc-red" />
            <span className="truncate">{attachment.fileName}</span>
          </a>
        ) : null
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-border pt-2">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likesCount} />
      </div>

      {post.comments.length > 0 && (
        <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar
                firstName={comment.author.first_name}
                lastName={comment.author.last_name}
                avatarUrl={comment.author.avatarUrl}
                size={28}
              />
              <div className="flex-1 rounded-xl bg-black/[.03] px-3 py-1.5 dark:bg-white/[.05]">
                <p className="text-xs font-medium text-foreground">
                  {comment.author.first_name} {comment.author.last_name}
                </p>
                <p className="text-sm text-foreground">{comment.content}</p>
              </div>
              {(canModerate || comment.author.id === currentUserId) && (
                <DeleteButton
                  size={12}
                  confirmMessage="Reactie verwijderen?"
                  onDelete={async () => {
                    await deleteCommentAction(comment.id);
                    onCommentDeleted(comment.id);
                  }}
                  className="mt-2 text-muted hover:text-voc-red disabled:opacity-50"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <CommentForm postId={post.id} />
      </div>
    </article>
  );
}
