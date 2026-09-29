import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import App from "./App";
import "./styles.css";
import "./navigation-density.css";
import "./project-record-density.css";
import "./overview-dashboard.css";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { platform?: string };
};

const navigatorWithUserAgentData = navigator as NavigatorWithUserAgentData;
const platformHint = (navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? "").toLowerCase();
const languageHint = navigator.language.toLowerCase();
const fontPlatform = platformHint.includes("mac") ? "mac" : platformHint.includes("win") ? "windows" : "other";
const fontLanguage = languageHint.startsWith("zh") ? "zh" : languageHint.startsWith("ja") ? "ja" : "latin";

document.documentElement.dataset.platform = fontPlatform;
document.documentElement.dataset.fontLanguage = fontLanguage;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
