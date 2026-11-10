"use client";

import { useEffect } from "react";
import { publicEnv } from "@/lib/env";

/** Client bootstrapping: analytics (when configured) and the PWA service worker. */
export function ClientBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if (!publicEnv.posthogKey) return;
    let cancelled = false;
    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(publicEnv.posthogKey, {
        api_host: publicEnv.posthogHost,
        // Cookieless, privacy-first defaults: no persistent identifiers, no session recording, no autocapture of inputs.
        persistence: "memory",
        autocapture: false,
        capture_pageview: "history_change",
        disable_session_recording: true,
        person_profiles: "identified_only",
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
