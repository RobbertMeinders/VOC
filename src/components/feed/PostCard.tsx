"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LikeButton } from "./LikeButton";
import { CommentForm } from "./CommentForm";
import { DeleteButton } from "./DeleteButton";
import { deleteCommentAction, deletePostAction, updatePostAction, type UpdatePostState } from "@/app/(app)/actions";
import { autoGrowTextarea } from "@/lib/dom/autoGrow";
import type { FeedPost } from "@/lib/feed/types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const editInitialState: UpdatePostState = {};

function EditSaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-voc-red px-3 py-1.5 text-xs font-medium text-white hover:bg-voc-red-dark disabled:opacity-60"
    >
      {pending ? "Opslaan…" : "Opslaan"}
    </button>
  );
}

function EditPostForm({
  post,
  onSaved,
  onCancel,
}: {
  post: FeedPost;
  onSaved: (post: FeedPost) => void;
  onCancel: () => void;
}) {
  const updateWithId = updatePostAction.bind(null, post.id);
  const [state, formAction] = useActionState(updateWithId, editInitialState);

  useEffect(() => {
    if (state.success && state.post) {
      onSaved(state.post);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-3">
      <textarea
        name="content"
        rows={2}
        required
        defaultValue={post.content ?? ""}
        onInput={(e) => autoGrowTextarea(e.currentTarget, 240)}
        className="w-full resize-none overflow-y-auto rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
      />
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-voc-red">
          {state.error}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <EditSaveButton />
        <button type="button" onClick={onCancel} className="text-xs text-muted hover:underline">
          Annuleren
        </button>
      </div>
    </form>
  );
}

export function PostCard({
  post,
  currentUserId,
  canModerate,
  onDeleted,
  onUpdated,
  onCommentDeleted,
}: {
  post: FeedPost;
  currentUserId: string;
  canModerate: boolean;
  onDeleted: (postId: string) => void;
  onUpdated: (post: FeedPost) => void;
  onCommentDeleted: (commentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isOwnPost = post.author.id === currentUserId;
  const canDeletePost = canModerate || isOwnPost;
  const isEdited = post.updatedAt !== post.createdAt;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leden/${post.author.id}`} className="flex items-center gap-3">
          <Avatar firstName={post.author.first_name} lastName={post.author.last_name} avatarUrl={post.author.avatarUrl} size={40} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.author.first_name} {post.author.last_name}
            </p>
            <p className="text-xs text-muted">
              {formatDate(post.createdAt)}
              {isEdited && " · bewerkt"}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {isOwnPost && !editing && (
            <button
              type="button"
              title="Bewerken"
              aria-label="Bewerken"
              onClick={() => setEditing(true)}
              className="text-muted hover:text-voc-red"
            >
              <Pencil size={14} />
            </button>
          )}
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
      </div>

      {editing ? (
        <EditPostForm post={post} onSaved={(updated) => { onUpdated(updated); setEditing(false); }} onCancel={() => setEditing(false)} />
      ) : (
        post.content && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>
      )}

      {post.attachments.map((attachment) =>
        attachment.type === "image" && attachment.url ? (
          <Image
            key={attachment.id}
            src={attachment.url}
            alt={attachment.fileName}
            width={0}
            height={0}
            sizes="(min-width: 640px) 600px, 100vw"
            className="mt-3 max-h-[520px] w-full rounded-xl object-contain"
            style={{ width: "100%", height: "auto" }}
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
