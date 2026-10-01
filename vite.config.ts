import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/work/" : "/",
  plugins: [react()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL(".", import.meta.url)), fileURLToPath(new URL("../../web-user/src/components/ui", import.meta.url))],
    },
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    // Cpolar's free plan assigns a new random subdomain whenever the tunnel
    // restarts. Restrict access to Cpolar-owned suffixes instead of disabling
    // Vite's host validation entirely.
    allowedHosts: [".cpolar.cn", ".cpolar.top"],
  },
});
