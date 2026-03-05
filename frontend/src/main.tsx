import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/styles/index.scss"; // ✅ tu global real (no el partial)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);