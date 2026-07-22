import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages URL: https://saraxlinnea.github.io/california-net-load/
// Local: npm run dev still serves under this base (open the printed URL).
export default defineConfig({
  plugins: [react()],
  base: "/california-net-load/",
});
