"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { FileText, MessageCircle, ThumbsUp } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { LikeButton } from "./LikeButton";
import { CommentForm } from "./CommentForm";
import { LikersOverlay } from "./LikersOverlay";
import { MentionDropdown } from "./MentionDropdown";
import {
  deleteCommentAction,
  deletePostAction,
  getCommentLikersAction,
  getPostLikersAction,
  toggleCommentLikeAction,
  toggleLikeAction,
  updateCommentAction,
  updatePostAction,
  type UpdateCommentState,
  type UpdatePostState,
} from "@/app/(app)/actions";
import { autoGrowTextarea } from "@/lib/dom/autoGrow";
import { useMentionField } from "@/lib/feed/useMentionField";
import { formatRelativeTime } from "@/lib/format/date";
import { PostTypePicker } from "./PostTypePicker";
import { POST_TYPE_BADGE_CLASS, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedComment, FeedPost } from "@/lib/feed/types";

const VISIBLE_COMMENTS = 4;

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
  const [content, setContent] = useState(post.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionField(content, setContent);

  useEffect(() => {
    if (state.success && state.post) {
      onSaved(state.post);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          name="content"
          rows={2}
          required
          value={content}
          onChange={(e) => {
            mention.handleInput(e.currentTarget);
            autoGrowTextarea(e.currentTarget, 240);
          }}
          className="w-full resize-none overflow-y-auto rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
        {mention.open && (
          <MentionDropdown
            results={mention.results}
            onSelect={(name, kind, id) => textareaRef.current && mention.select(textareaRef.current, name, kind, id)}
          />
        )}
      </div>
      <div className="mt-2">
        <PostTypePicker defaultValue={post.type} />
      </div>
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

function likeSummaryText(topLikerName: string | null, count: number): string | null {
  if (!topLikerName || count === 0) return null;
  if (count === 1) return topLikerName;
  return `${topLikerName} en ${count - 1} ${count - 1 === 1 ? "ander" : "anderen"}`;
}

const editCommentInitialState: UpdateCommentState = {};

function EditCommentForm({
  comment,
  onSaved,
  onCancel,
}: {
  comment: FeedComment;
  onSaved: (comment: FeedComment) => void;
  onCancel: () => void;
}) {
  const updateWithId = updateCommentAction.bind(null, comment.id);
  const [state, formAction] = useActionState(updateWithId, editCommentInitialState);
  const [content, setContent] = useState(comment.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionField(content, setContent);

  useEffect(() => {
    if (state.success && state.comment) {
      onSaved(state.comment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex-1">
      <div className="relative">
        <textarea
          ref={textareaRef}
          name="content"
          rows={2}
          required
          value={content}
          onChange={(e) => {
            mention.handleInput(e.currentTarget);
            autoGrowTextarea(e.currentTarget, 160);
          }}
          className="w-full resize-none overflow-y-auto rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-voc-red focus:outline-none focus:ring-2 focus:ring-voc-red/20"
        />
        {mention.open && (
          <MentionDropdown
            results={mention.results}
            onSelect={(name, kind, id) => textareaRef.current && mention.select(textareaRef.current, name, kind, id)}
          />
        )}
      </div>
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-voc-red">
          {state.error}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-voc-red px-3 py-1 text-xs font-medium text-white hover:bg-voc-red-dark"
        >
          Opslaan
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-muted hover:underline">
          Annuleren
        </button>
      </div>
    </form>
  );
}

// Voor reacties gespiegeld t.o.v. het bericht zelf: "Leuk" (tekst, links) is
// de toggle, het duimpje + aantal (rechts) opent — net als de naam-en-
// aantal-tekst bij een bericht — de lijst met wie de reactie leuk vindt.
function CommentLikeRow({
  commentId,
  createdAt,
  initialLiked,
  initialCount,
  onOpenLikers,
}: {
  commentId: string;
  createdAt: string;
  initialLiked: boolean;
  initialCount: number;
  onOpenLikers: () => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    startTransition(async () => {
      try {
        const result = await toggleCommentLikeAction(commentId);
        if (result.liked !== nextLiked) {
          setLiked(result.liked);
          setCount((c) => c + (result.liked ? 1 : -1));
        }
      } catch {
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
      }
    });
  }

  return (
    <div className="mt-1 flex items-center justify-between gap-2 pl-3">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={clsx("text-xs font-medium", liked ? "text-voc-red" : "text-muted hover:text-voc-red")}
      >
        Leuk
      </button>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted">{formatRelativeTime(createdAt)}</span>
        <button
          type="button"
          onClick={onOpenLikers}
          className={clsx("flex items-center gap-1", count > 0 ? "text-voc-red" : "text-muted hover:text-voc-red")}
        >
          <ThumbsUp size={13} className={count > 0 ? "fill-voc-red" : ""} />
          {count > 0 && <span className="text-xs">{count}</span>}
        </button>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  canDelete,
  canEdit,
  onDeleted,
  onUpdated,
}: {
  comment: FeedComment;
  canDelete: boolean;
  canEdit: boolean;
  onDeleted: (commentId: string) => void;
  onUpdated: (comment: FeedComment) => void;
}) {
  const [showLikers, setShowLikers] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div id={`comment-${comment.id}`} className="flex items-start gap-2 scroll-mt-20">
      <Avatar
        firstName={comment.author.first_name}
        lastName={comment.author.last_name}
        avatarUrl={comment.author.avatarUrl}
        size={28}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <EditCommentForm
            comment={comment}
            onSaved={(updated) => {
              onUpdated(updated);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="flex items-start justify-between gap-2 rounded-xl bg-black/[.03] px-3 py-1.5 dark:bg-white/[.05]">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  {comment.author.first_name} {comment.author.last_name}
                </p>
                <ExpandableText
                  text={comment.content}
                  lines={5}
                  mentions
                  expandLabel="Meer weergeven"
                  collapseLabel="Minder weergeven"
                />
              </div>
              {(canDelete || canEdit) && (
                <ActionMenu
                  items={[
                    ...(canEdit ? [{ label: "Bewerken", onClick: () => setEditing(true) }] : []),
                    ...(canDelete
                      ? [
                          {
                            label: "Verwijderen",
                            danger: true,
                            onClick: () => {
                              if (window.confirm("Reactie verwijderen?")) {
                                void deleteCommentAction(comment.id).then(() => onDeleted(comment.id));
                              }
                            },
                          },
                        ]
                      : []),
                  ]}
                />
              )}
            </div>
            <CommentLikeRow
              commentId={comment.id}
              createdAt={comment.createdAt}
              initialLiked={comment.likedByMe}
              initialCount={comment.likesCount}
              onOpenLikers={() => setShowLikers(true)}
            />
          </>
        )}
      </div>
      {showLikers && (
        <LikersOverlay
          title="Vind ik leuk"
          fetchLikers={() => getCommentLikersAction(comment.id)}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}

export function PostCard({
  post,
  currentUserId,
  canModerate,
  canEditOthers,
  onDeleted,
  onUpdated,
  onCommentDeleted,
  onCommentUpdated,
  forceCommentsOpen = false,
}: {
  post: FeedPost;
  currentUserId: string;
  canModerate: boolean;
  canEditOthers: boolean;
  onDeleted: (postId: string) => void;
  onUpdated: (post: FeedPost) => void;
  onCommentDeleted: (commentId: string) => void;
  onCommentUpdated: (comment: FeedComment) => void;
  forceCommentsOpen?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(forceCommentsOpen);
  const [showAllComments, setShowAllComments] = useState(forceCommentsOpen);
  const [showLikers, setShowLikers] = useState(false);
  const isOwnPost = post.author.id === currentUserId;
  const canEditPost = isOwnPost || canEditOthers;
  const canDeletePost = canModerate || isOwnPost;
  const isEdited = post.updatedAt !== post.createdAt;

  const visibleComments = showAllComments ? post.comments : post.comments.slice(0, VISIBLE_COMMENTS);
  const remainingComments = post.comments.length - visibleComments.length;
  const summary = likeSummaryText(post.likeSummary.topLikerName, post.likeSummary.count);

  return (
    <article id={`post-${post.id}`} className="scroll-mt-20 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leden/${post.author.id}`} className="flex items-center gap-3">
          <Avatar firstName={post.author.first_name} lastName={post.author.last_name} avatarUrl={post.author.avatarUrl} size={40} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.author.first_name} {post.author.last_name}
            </p>
            <p className="text-xs text-muted">
              {formatRelativeTime(post.createdAt)}
              {isEdited && " · bewerkt"}
            </p>
          </div>
        </Link>
        {(canEditPost || canDeletePost) && !editing && (
          <ActionMenu
            items={[
              ...(canEditPost ? [{ label: "Bewerken", onClick: () => setEditing(true) }] : []),
              ...(canDeletePost
                ? [
                    {
                      label: "Verwijderen",
                      danger: true,
                      onClick: () => {
                        if (window.confirm("Weet je zeker dat je dit bericht wilt verwijderen?")) {
                          void deletePostAction(post.id).then(() => onDeleted(post.id));
                        }
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>

      {editing ? (
        <EditPostForm post={post} onSaved={(updated) => { onUpdated(updated); setEditing(false); }} onCancel={() => setEditing(false)} />
      ) : (
        <>
          {post.type && (
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${POST_TYPE_BADGE_CLASS[post.type]}`}
            >
              {POST_TYPE_LABELS[post.type]}
            </span>
          )}
          {post.content && <ExpandableText text={post.content} className="mt-2" lines={5} mentions expandLabel="Meer weergeven" collapseLabel="Minder weergeven" />}
        </>
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

      <div className="mt-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <LikeButton targetId={post.id} initialLiked={post.likedByMe} initialCount={post.likesCount} toggleAction={toggleLikeAction} />
          {summary && (
            <button type="button" onClick={() => setShowLikers(true)} className="truncate text-xs text-muted hover:underline">
              {summary}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCommentsOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.06]"
        >
          <MessageCircle size={16} />
          {post.comments.length > 0 && post.comments.length}
        </button>
      </div>

      {commentsOpen && (
        <div className="mt-2 flex flex-col gap-2">
          {visibleComments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              canDelete={canModerate || comment.author.id === currentUserId}
              canEdit={comment.author.id === currentUserId || canEditOthers}
              onDeleted={onCommentDeleted}
              onUpdated={onCommentUpdated}
            />
          ))}
          {remainingComments > 0 && (
            <button
              type="button"
              onClick={() => setShowAllComments(true)}
              className="rounded-lg py-1.5 text-center text-xs font-medium text-voc-red hover:underline"
            >
              Nog {remainingComments} {remainingComments === 1 ? "reactie" : "reacties"} bekijken
            </button>
          )}
          <div className="mt-1">
            <CommentForm postId={post.id} />
          </div>
        </div>
      )}

      {showLikers && (
        <LikersOverlay title="Vind ik leuk" fetchLikers={() => getPostLikersAction(post.id)} onClose={() => setShowLikers(false)} />
      )}
    </article>
  );
}
