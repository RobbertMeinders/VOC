import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import { fetchFeedPosts } from "@/lib/feed/queries";
import { isAdmin, isBoard } from "@/lib/auth/roles";
import { FeedList } from "@/components/feed/FeedList";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [posts, avatarUrl] = await Promise.all([
    fetchFeedPosts(supabase, profile.id),
    getSignedStorageUrl("avatars", profile.avatar_url),
  ]);

  return (
    <FeedList
      initialPosts={posts}
      currentAuthor={{
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatarUrl,
      }}
      canModerate={isBoard(profile.role)}
      canEditOthers={isAdmin(profile.role)}
    />
  );
}
