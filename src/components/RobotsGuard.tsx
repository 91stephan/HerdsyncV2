import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Forces `noindex,nofollow` on all authenticated/private routes.
 * Public routes are left as `index,follow` (or whatever the page's
 * own useSEO call set).
 *
 * Mounted once at the app root inside <BrowserRouter>. Runs AFTER
 * child page useSEO effects (parent effects fire after children),
 * so this is the authoritative final word for private routes.
 */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/livestock",
  "/feeding",
  "/inventory",
  "/health",
  "/audit",
  "/reports",
  "/tracking",
  "/market",
  "/compliance",
  "/employees",
  "/employee-tasks",
  "/animal-sale",
  "/expenses",
  "/ask-a-pro",
  "/settings",
  "/admin",
  "/auth",
  "/reset-password",
  "/trial-expired",
  "/delete-account",
];

function isPrivate(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function setRobots(value: string) {
  let el = document.querySelector(
    'meta[name="robots"]',
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "robots");
    document.head.appendChild(el);
  }
  el.content = value;
}

export function RobotsGuard() {
  const location = useLocation();
  useEffect(() => {
    if (isPrivate(location.pathname)) {
      setRobots("noindex,nofollow");
    }
    // For public routes, the page's useSEO already sets index,follow.
  }, [location.pathname]);
  return null;
}
