import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { EnvCheck } from "./components/EnvCheck.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <EnvCheck>
    <App />
  </EnvCheck>
);
