import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";
import { socketManager } from './lib/socketManager';

// Initialize socket manager
socketManager;

// Cleanup socket manager on app unmount
window.addEventListener('beforeunload', () => {
  socketManager.destroy();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
