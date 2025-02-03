import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import packageJson from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        APP_VERSION: JSON.stringify(packageJson.version),
    },
    plugins: [react()],
});
