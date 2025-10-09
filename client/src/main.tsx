// Polyfill for global and process in browser
import { Buffer } from "buffer";
window.Buffer = Buffer;
window.global = window;

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <App />
);
