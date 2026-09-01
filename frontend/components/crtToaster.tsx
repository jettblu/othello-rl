"use client";

import { ToastBar, Toaster, resolveValue } from "react-hot-toast";

export default function CrtToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 16, right: 12 }}
      toastOptions={{
        className: "crt-toast",
        icon: null,
        style: {
          background: "var(--ink)",
          color: "var(--phosphor)",
          borderRadius: 0,
          boxShadow: "none",
          padding: "8px 12px",
          fontFamily: "var(--font-plex-mono), ui-monospace, monospace",
          fontSize: "12px",
          maxWidth: "min(22rem, calc(100vw - 1.5rem))",
        },
        error: {
          className: "crt-toast crt-toast--error",
          style: {
            background: "var(--ink)",
            color: "var(--amber)",
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {() => (
            <>
              <span className="crt-toast__tag">
                {t.type === "error" ? "err:" : "ok:"}
              </span>
              <span>{resolveValue(t.message, t)}</span>
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
