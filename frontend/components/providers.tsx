"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { Provider } from "react-redux";
import store from "@/store";
import { dropOrphanServiceWorkers } from "@/helpers/dropOrphanServiceWorkers";

const loadFeatures = () =>
  import("@/motion-features").then((mod) => mod.default);

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    dropOrphanServiceWorkers();
  }, []);

  return (
    <Provider store={store}>
      <LazyMotion features={loadFeatures} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </Provider>
  );
}
