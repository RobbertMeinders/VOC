"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

export type UpdateProfileState = { error?: string; success?: boolean };

export async function updateProfileAction(
  _prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const profile = await requireProfile();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "Voor- en achternaam zijn verplicht." };
  }

  const supabase = await createClient();

  let avatarPath: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const result = await uploadImage(supabase, "avatars", profile.id, avatarFile);
    if ("error" in result) return { error: result.error };
    avatarPath = result.path;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      job_title: jobTitle || null,
      phone: phone || null,
      website: website || null,
      ...(avatarPath ? { avatar_url: avatarPath } : {}),
    })
    .eq("id", profile.id);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/profiel");
  return { success: true };
}
