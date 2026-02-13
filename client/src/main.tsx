// Polyfill for global and process in browser
import { Buffer } from "buffer";
window.Buffer = Buffer;
window.global = window;

// Central GSAP plugin registration (must run once globally)
import "./lib/gsap";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <App />
);
