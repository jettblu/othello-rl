// Fathom.tsx
"use client";

import { load, trackPageview } from "fathom-client";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FATHOM_DOMAINS, FATHOM_SITE_ID } from "@/constants/analytics";

function TrackPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    load(FATHOM_SITE_ID, {
      includedDomains: [...FATHOM_DOMAINS],
    });
  }, []);

  useEffect(() => {
    trackPageview();

    // Record a pageview when route changes
  }, [pathname, searchParams]);

  return null;
}

export default function Fathom() {
  return (
    <Suspense fallback={null}>
      <TrackPageView />
    </Suspense>
  );
}
