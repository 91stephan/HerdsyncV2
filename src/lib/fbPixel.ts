// Facebook Pixel, gated by VITE_FB_PIXEL_ID. When the env var is unset
// (current state) every function below is a safe no-op so we never ship a
// broken or partially-initialised pixel to users.
//
// To enable: add VITE_FB_PIXEL_ID=<your numeric pixel id> to the project env.

const PIXEL_ID = (import.meta.env.VITE_FB_PIXEL_ID as string | undefined)?.trim();

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let initialised = false;

export function isPixelEnabled(): boolean {
  return !!PIXEL_ID && /^\d{6,20}$/.test(PIXEL_ID);
}

export function initFacebookPixel(): void {
  if (!isPixelEnabled() || initialised || typeof window === "undefined") return;
  initialised = true;

  // Standard Meta Pixel base code.
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e);
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq?.("init", PIXEL_ID!);
  window.fbq?.("track", "PageView");
}

export function trackPageView(): void {
  if (!isPixelEnabled()) return;
  window.fbq?.("track", "PageView");
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!isPixelEnabled()) return;
  if (params) window.fbq?.("track", name, params);
  else window.fbq?.("track", name);
}
