import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * On native platforms, scroll the focused input into view when the on-screen
 * keyboard opens. The Capacitor Keyboard plugin (`resize: 'body'`) handles the
 * WebView resize; this hook handles the actual scroll for inputs that sit
 * inside scrollable containers.
 */
export function useKeyboardScroll() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { Keyboard } = await import("@capacitor/keyboard");

        const showHandler = await Keyboard.addListener("keyboardDidShow", () => {
          const el = document.activeElement as HTMLElement | null;
          if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
            // Wait one frame for the resize to settle, then scroll into view.
            requestAnimationFrame(() => {
              el.scrollIntoView({ block: "center", behavior: "smooth" });
            });
          }
        });

        cleanup = () => {
          showHandler.remove();
        };
      } catch (e) {
        // Plugin not installed in this build — silently ignore.
      }
    })();

    return () => {
      cleanup?.();
    };
  }, []);
}
