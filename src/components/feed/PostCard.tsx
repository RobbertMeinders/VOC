"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { FileText, MessageCircle, ThumbsUp } from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Card } from "@/components/ui/Card";
import { ProfileLink } from "@/components/ui/ProfileLink";
import { AttachmentCarousel } from "./AttachmentCarousel";
import { LikeButton } from "./LikeButton";
import { CommentForm } from "./CommentForm";
import { LikersOverlay } from "./LikersOverlay";
import { ReportPostOverlay } from "./ReportPostOverlay";
import { MentionEditor } from "./MentionEditor";
import { useConfirm } from "@/lib/ui/ConfirmDialogContext";
import { memberHref } from "@/lib/members/slug";
import {
  deleteCommentAction,
  deletePostAction,
  getCommentLikersAction,
  getPostAction,
  getPostLikersAction,
  toggleCommentLikeAction,
  toggleLikeAction,
  updateCommentAction,
  updatePostAction,
  type UpdateCommentState,
  type UpdatePostState,
} from "@/app/(app)/actions";
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

  useEffect(() => {
    if (state.success && state.post) {
      onSaved(state.post);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-3">
      <MentionEditor name="content" placeholder="" defaultValue={post.content ?? ""} minHeightClassName="min-h-14" maxHeight={240} autoFocus />
      <div className="mt-2">
        <PostTypePicker defaultValue={post.type} />
      </div>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-danger-text">
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

// Afwerkronde blok 4: één gedeelde samenvattingsregel i.p.v. een naam-
// gebaseerde "X en N anderen" naast een los reactie-aantal verderop in de
// actierij — "1 vind-ik-leuk · 2 reacties".
function likeAndCommentSummary(likeCount: number, commentCount: number): string | null {
  const parts: string[] = [];
  if (likeCount > 0) parts.push(`${likeCount} vind-ik-leuk`);
  if (commentCount > 0) parts.push(`${commentCount} ${commentCount === 1 ? "reactie" : "reacties"}`);
  return parts.length > 0 ? parts.join(" · ") : null;
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && state.comment) {
      onSaved(state.comment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex-1">
      <MentionEditor
        name="content"
        placeholder=""
        defaultValue={comment.content}
        singleLine
        onEnter={() => formRef.current?.requestSubmit()}
        autoFocus
      />
      {state.error && (
        <p role="alert" className="mt-1 text-xs text-danger-text">
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
        className={clsx("text-xs font-medium", liked ? "text-voc-red-text" : "text-muted hover:text-foreground")}
      >
        Leuk
      </button>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-muted">{formatRelativeTime(createdAt)}</span>
        <button
          type="button"
          onClick={onOpenLikers}
          aria-label="Bekijk wie dit leuk vindt"
          className={clsx("flex items-center gap-1", count > 0 ? "text-voc-red-text" : "text-muted hover:text-foreground")}
        >
          <ThumbsUp key={String(liked)} size={13} className={clsx(count > 0 && "fill-voc-red", liked && "animate-pop")} />
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
  const confirm = useConfirm();

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
                            onClick: async () => {
                              const confirmed = await confirm({
                                title: "Reactie verwijderen?",
                                confirmLabel: "Verwijderen",
                                danger: true,
                              });
                              if (confirmed) {
                                void deleteCommentAction(comment.id).then((result) => {
                                  if (result.error) window.alert(result.error);
                                  else onDeleted(comment.id);
                                });
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
  onCommentCreated,
  forceCommentsOpen = false,
  compact = false,
}: {
  post: FeedPost;
  currentUserId: string;
  canModerate: boolean;
  canEditOthers: boolean;
  onDeleted: (postId: string) => void;
  onUpdated: (post: FeedPost) => void;
  onCommentDeleted: (commentId: string) => void;
  onCommentUpdated: (comment: FeedComment) => void;
  onCommentCreated: (comment: FeedComment) => void;
  forceCommentsOpen?: boolean;
  // Alleen voor de berichten-sectie op het eigen ledenprofiel: kleinere
  // foto's en reacties die niet standaard al openstaan, zodat deze sectie
  // niet met de volle community-feed-intensiteit op de profielpagina staat.
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  // Afwerkronde blok 4: reactieveld + reacties staan standaard dicht (een
  // altijd-open reactieveld onder élk bericht maakte de feed lang en druk) —
  // behalve wanneer een notificatielink hier rechtstreeks naar een reactie
  // verwijst (forceCommentsOpen), die moet meteen zichtbaar zijn.
  const [commentsOpen, setCommentsOpen] = useState(forceCommentsOpen);
  const [showAllComments, setShowAllComments] = useState(forceCommentsOpen);
  const [showLikers, setShowLikers] = useState(false);
  const [reporting, setReporting] = useState(false);
  const confirm = useConfirm();
  const isOwnPost = post.author.id === currentUserId;
  const canEditPost = isOwnPost || canEditOthers;
  const canDeletePost = canModerate || isOwnPost;
  const isEdited = post.updatedAt !== post.createdAt;

  const visibleComments = showAllComments ? post.comments : post.comments.slice(0, VISIBLE_COMMENTS);
  const remainingComments = post.comments.length - visibleComments.length;
  const summary = likeAndCommentSummary(post.likesCount, post.comments.length);

  return (
    <Card
      as="article"
      id={`post-${post.id}`}
      padded={false}
      className={clsx("animate-rise-in scroll-mt-20", compact ? "p-3" : "p-4")}
    >
      <div className="flex items-start justify-between gap-2">
        <ProfileLink href={memberHref(post.author)} anonymized={post.author.anonymized} className="flex items-center gap-3">
          <Avatar
            firstName={post.author.first_name}
            lastName={post.author.last_name}
            avatarUrl={post.author.avatarUrl}
            size={compact ? 32 : 40}
          />
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.author.first_name} {post.author.last_name}
            </p>
            <p className="text-xs text-muted">
              {formatRelativeTime(post.createdAt)}
              {isEdited && " · bewerkt"}
            </p>
          </div>
        </ProfileLink>
        {(canEditPost || canDeletePost || !isOwnPost) && !editing && (
          <ActionMenu
            items={[
              ...(canEditPost ? [{ label: "Bewerken", onClick: () => setEditing(true) }] : []),
              ...(canDeletePost
                ? [
                    {
                      label: "Verwijderen",
                      danger: true,
                      onClick: async () => {
                        const confirmed = await confirm({
                          title: "Bericht verwijderen?",
                          confirmLabel: "Verwijderen",
                          danger: true,
                        });
                        if (confirmed) {
                          void deletePostAction(post.id).then((result) => {
                            if (result.error) window.alert(result.error);
                            else onDeleted(post.id);
                          });
                        }
                      },
                    },
                  ]
                : []),
              ...(!isOwnPost ? [{ label: "Rapporteren", onClick: () => setReporting(true) }] : []),
            ]}
          />
        )}
      </div>

      {reporting && <ReportPostOverlay postId={post.id} onClose={() => setReporting(false)} />}

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

      <AttachmentCarousel images={post.attachments.filter((a) => a.type === "image")} compact={compact} />
      {post.attachments
        .filter((a) => a.type !== "image" && a.url)
        .map((attachment) => (
          <a
            key={attachment.id}
            href={attachment.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-foreground/30"
          >
            <FileText size={16} className="text-petrol" />
            <span className="truncate">{attachment.fileName}</span>
          </a>
        ))}

      {/* Afwerkronde blok 4: één samenvattingsregel ("1 vind-ik-leuk · 2
          reacties") boven de twee knoppen, i.p.v. een naam-gebaseerde tekst
          links en een los reactie-aantal rechts op dezelfde rij. */}
      {summary && (
        <button type="button" onClick={() => setShowLikers(true)} className="mt-2 block text-xs text-muted hover:underline">
          {summary}
        </button>
      )}
      <div className="mt-1 flex items-center gap-1">
        <LikeButton
          targetId={post.id}
          initialLiked={post.likedByMe}
          toggleAction={toggleLikeAction}
          onToggled={() => {
            void getPostAction(post.id).then((fresh) => fresh && onUpdated(fresh));
          }}
        />
        <button
          type="button"
          onClick={() => setCommentsOpen((o) => !o)}
          aria-expanded={commentsOpen}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-black/[.04] hover:text-foreground dark:hover:bg-white/[.06]"
        >
          <MessageCircle size={16} />
          Reageren
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
              className="rounded-lg py-1.5 text-center text-xs font-medium text-petrol hover:underline"
            >
              Nog {remainingComments} {remainingComments === 1 ? "reactie" : "reacties"} bekijken
            </button>
          )}
          <div className="mt-1">
            <CommentForm postId={post.id} onCreated={onCommentCreated} />
          </div>
        </div>
      )}

      {showLikers && (
        <LikersOverlay title="Vind ik leuk" fetchLikers={() => getPostLikersAction(post.id)} onClose={() => setShowLikers(false)} />
      )}
    </Card>
  );
}
