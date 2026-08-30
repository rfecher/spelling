import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production lives at https://rfecher.github.io/spelling/, but the dev server
// serves from the root so `npm run dev` opens straight onto the app. Everything
// that fetches a file uses import.meta.env.BASE_URL, so both work unchanged.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/spelling/" : "/",
  server: {
    port: Number(process.env.PORT) || 5173,
    // Lets the kids' tablets reach the dev server over the home network.
    host: true,
  },
}));
