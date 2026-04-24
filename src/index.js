import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress the harmless ResizeObserver loop warning that React dev overlay
// incorrectly shows as a fatal error. This is a known browser/library quirk.
const _origError = window.onerror;
window.onerror = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) return true;
  return _origError ? _origError(msg, ...args) : false;
};
const _origConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.toString?.().includes?.('ResizeObserver loop')) return;
  _origConsoleError(...args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
