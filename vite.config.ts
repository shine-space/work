import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Cpolar's free plan assigns a new random subdomain whenever the tunnel
    // restarts. Restrict access to Cpolar-owned suffixes instead of disabling
    // Vite's host validation entirely.
    allowedHosts: [".cpolar.cn", ".cpolar.top"],
  },
});
