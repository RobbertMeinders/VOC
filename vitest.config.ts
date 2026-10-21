import { defineConfig } from "vitest/config";
import path from "node:path";

// Portaal-gezondheidsonderzoek Blok B2: eerste testsuite. Alleen
// server-only-vrije, pure logica (zie src/lib/**/*.test.ts) — geen
// DB/Supabase-integratietests, die vragen een los besluit over
// test-infrastructuur (een eigen Supabase-testproject) en horen niet in deze
// eerste ronde.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
