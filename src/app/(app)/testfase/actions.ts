"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/supabase/upload";

export type SubmitTestfaseFeedbackState = { error?: string; success?: boolean };

const ALLOWED_SCREENSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
// Zelfde boodschap als enforce_testfase_feedback_rate_limit() (0124) — zo
// herkennen we 'm hier om 'm woordelijk door te geven i.p.v. de generieke
// foutmelding, zonder de exacte Postgres-foutstructuur te hoeven parsen.
const RATE_LIMIT_MESSAGE = "Je hebt vandaag al genoeg feedback achtergelaten. Probeer het morgen opnieuw.";

export async function submitTestfaseFeedbackAction(
  _prevState: SubmitTestfaseFeedbackState,
  formData: FormData
): Promise<SubmitTestfaseFeedbackState> {
  const profile = await requireProfile();

  const type = String(formData.get("type") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const page = String(formData.get("page") ?? "").trim() || null;
  const userAgent = String(formData.get("user_agent") ?? "").trim() || null;
  const screenWidthRaw = String(formData.get("screen_width") ?? "").trim();
  const screenWidth = screenWidthRaw ? Number.parseInt(screenWidthRaw, 10) : null;

  if (type !== "probleem" && type !== "idee") {
    return { error: "Kies een type." };
  }
  if (!message) {
    return { error: "Vul een omschrijving in." };
  }

  const supabase = await createClient();

  // Optioneel: screenshot eerst uploaden (vóór de insert) zodat een
  // mislukte upload het hele formulier laat falen i.p.v. een feedbackrij
  // zonder screenshot achter te laten terwijl de melding wél "gelukt" leek.
  let screenshotPath: string | null = null;
  const screenshotFile = formData.get("screenshot");
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    if (!ALLOWED_SCREENSHOT_TYPES.has(screenshotFile.type)) {
      return { error: "De schermafbeelding moet een PNG, JPEG of WebP zijn." };
    }
    const result = await uploadImage(supabase, "feedback-screenshots", profile.id, screenshotFile);
    if ("error" in result) {
      return { error: result.error };
    }
    screenshotPath = result.path;
  }

  const { error } = await supabase.from("testfase_feedback").insert({
    profile_id: profile.id,
    type,
    message,
    page,
    user_agent: userAgent,
    screen_width: screenWidth !== null && Number.isFinite(screenWidth) ? screenWidth : null,
    screenshot_path: screenshotPath,
  });

  if (error) {
    return { error: error.message.includes(RATE_LIMIT_MESSAGE) ? RATE_LIMIT_MESSAGE : "Versturen is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/feedback");
  return { success: true };
}
