import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const RELOAD_FLAG = "lazy-reload";
  const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG);
  if (!alreadyReloaded) {
    sessionStorage.setItem(RELOAD_FLAG, "true");
    window.location.reload();
  } else {
    // Reload already happened once and error persists — don't loop.
    sessionStorage.removeItem(RELOAD_FLAG);
    console.error("Stale chunk reload did not resolve the error:", event);
  }
});

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New version detected in background — activate it immediately
    // and reload so the user always gets the latest build.
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Re-check for a new service worker every hour so long-lived
      // open tabs don't stay stuck on an old build.
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error("SW registration failed:", error);
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
