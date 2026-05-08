import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "@/lib/telemetry";
import { initFacebookPixel } from "@/lib/fbPixel";
import { installAltTextDevWatcher } from "@/lib/altTextAudit";

installGlobalErrorHandlers();
initFacebookPixel();
installAltTextDevWatcher();

createRoot(document.getElementById("root")!).render(<App />);
