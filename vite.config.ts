import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split the third-party libraries out of the app bundle.
        //
        // Measured, so the tradeoff is on the record: this does NOT reduce
        // first-load weight. A cold homepage was 210kB of JS before and 211kB
        // after — three.js was already excluded, because the Room route is
        // lazy and Vite's automatic splitting handles that on its own. (The
        // "chunks larger than 500kB" build warning is about the Room chunk,
        // which no first paint ever fetches.)
        //
        // The win is purely caching: vendor code changes only on a dependency
        // upgrade, so a routine deploy invalidates the ~65kB app chunk instead
        // of the whole 210kB. That is worth having, but it is the only reason
        // this block exists — do not expect it to speed up a first visit.
        //
        // Grouped coarsely and by import path on purpose. Fine-grained
        // per-package chunks are where manualChunks goes wrong — split React
        // away from something that touches it at module-evaluation time and
        // you get an "undefined is not a function" only in the production
        // build. Anything not matched here stays with the app.
        manualChunks(id) {
          // Vite's __vitePreload helper is a tiny module shared by every
          // dynamic import, so the entry chunk always depends on it. Left
          // unassigned, Rollup is free to fold it into whichever chunk it
          // likes — it picked vendor-three, which made the entry statically
          // import all 880kB of three.js and preload it on the landing page.
          // Pinning it to its own chunk keeps that dependency weightless.
          if (id.includes("preload-helper")) return "vite-preload";

          if (!id.includes("node_modules")) return;

          // three + its React bindings — by far the largest, and only the
          // Room route needs it.
          if (
            id.includes("/three/") ||
            id.includes("@react-three/") ||
            id.includes("/three-stdlib/")
          ) {
            return "vendor-three";
          }

          // Audio engine: wavesurfer plus the time-stretching worklet used
          // for slowed-down playback without pitch shift.
          if (id.includes("wavesurfer") || id.includes("soundtouch")) {
            return "vendor-audio";
          }

          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("framer-motion")) return "vendor-motion";

          // React and everything that binds directly to its internals stay
          // together, so their evaluation order can never be interleaved.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("react-router") ||
            id.includes("react-redux") ||
            id.includes("@reduxjs/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
