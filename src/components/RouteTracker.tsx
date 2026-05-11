import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/fbPixel";

const GA_MEASUREMENT_ID = "G-TMK6R8G8KT";

/**
 * Mounted once inside the BrowserRouter. Fires Facebook Pixel + GA4
 * PageView on every SPA route change.
 */
export function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === "function") {
      w.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
        send_to: GA_MEASUREMENT_ID,
      });
    }
  }, [location.pathname, location.search]);
  return null;
}
