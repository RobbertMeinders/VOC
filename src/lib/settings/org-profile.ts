import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type OrgProfile = {
  intro_text: string | null;
  mission_text: string | null;
  vision_text: string | null;
  header_image_path: string | null;
};

export const ORG_PROFILE_DEFAULTS: OrgProfile = {
  intro_text: null,
  mission_text: null,
  vision_text: null,
  header_image_path: null,
};

// Net als getAppSettings (zelfde cache()-per-request-redenering), maar leest
// uit org_profile i.p.v. app_settings — zie 0107_vereniging_bestuur_
// commissies.sql voor waarom dit bewust een aparte, niet-publieke tabel is.
export const getOrgProfile = cache(async (): Promise<OrgProfile> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_profile")
    .select("intro_text, mission_text, vision_text, header_image_path")
    .eq("id", true)
    .maybeSingle();
  return data ?? ORG_PROFILE_DEFAULTS;
});
