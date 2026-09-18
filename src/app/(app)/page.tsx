import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { PostCard, type FeedPost } from "@/components/feed/PostCard";

export const metadata: Metadata = { title: "Home" };

export default async function FeedPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("feed_posts")
    .select(
      "id, content, created_at, author:profiles!feed_posts_author_id_fkey(id, first_name, last_name, avatar_url)"
    )
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<FeedPost[]>();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4 opacity-70 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={profile.avatar_url} size={40} />
          <div className="flex h-11 flex-1 items-center rounded-full border border-border bg-background px-4 text-sm text-muted">
            Wat wil je delen met het netwerk?
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <MessageSquare size={14} />
          Berichten plaatsen volgt in de volgende fase van het ledenportaal.
        </p>
      </div>

      {posts && posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <MessageSquare size={28} className="text-muted" />
          <p className="text-sm font-medium text-foreground">Nog geen berichten</p>
          <p className="max-w-xs text-sm text-muted">
            Zodra leden updates delen met het netwerk, verschijnen ze hier in de community-feed.
          </p>
        </div>
      )}
    </div>
  );
}
