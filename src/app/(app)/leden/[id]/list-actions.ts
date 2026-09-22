"use server";

import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isBoard } from "@/lib/auth/roles";
import { fetchFeedPostsByAuthor } from "@/lib/feed/queries";
import { MEMBER_PROFILE_LIST_PAGE_SIZE } from "@/lib/feed/pagination";
import type { FeedPost } from "@/lib/feed/types";

export async function getMemberPostsPageAction(memberId: string, offset: number): Promise<FeedPost[]> {
  const viewer = await requireProfile();
  const supabase = await createClient();
  return fetchFeedPostsByAuthor(supabase, viewer.id, memberId, MEMBER_PROFILE_LIST_PAGE_SIZE, offset);
}

export type AttendedActivity = { id: string; title: string; starts_at: string };

export async function getAttendedActivitiesPageAction(memberId: string, offset: number): Promise<AttendedActivity[]> {
  const viewer = await requireProfile();
  const supabase = await createClient();

  // Zelfde zichtbaarheidsregel als op de profielpagina zelf: alleen het lid
  // zelf en bestuur/beheer zien deze lijst als de eigenaar 'm heeft
  // verborgen — de knop staat dan al niet in de UI, maar de server is de
  // echte grens, niet het wel/niet renderen van een knop.
  if (viewer.id !== memberId && !isBoard(viewer.role)) {
    const { data: member } = await supabase
      .from("profiles")
      .select("show_attended_activities")
      .eq("id", memberId)
      .maybeSingle();
    if (member && !member.show_attended_activities) return [];
  }

  const { data } = await supabase
    .from("activity_registrations")
    .select("activity:activities(id, title, starts_at)")
    .eq("profile_id", memberId)
    .eq("attended", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + MEMBER_PROFILE_LIST_PAGE_SIZE - 1)
    .returns<{ activity: AttendedActivity | null }[]>();

  return (data ?? [])
    .map((r) => r.activity)
    .filter((a): a is AttendedActivity => a !== null)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}
