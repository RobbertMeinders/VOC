"use client";

import { useEffect } from "react";
import { heartbeatAction } from "@/app/(app)/actions";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

// Houdt profiles.last_active_at actueel zolang dit tabblad open en
// zichtbaar is, zodat beheer een echte "nu online"-teller kan tonen
// (zie de "Leden nu online"-stat op /beheer) i.p.v. alleen bij te werken
// op login. Rendert niets — puur een effect-drager.
export function OnlineHeartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void heartbeatAction();
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
