import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ChillNet web client. Talks to the API gateway at :8080 through a dev proxy so
// the browser never has to deal with CORS during local development.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5174,
		proxy: {
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
			// STOMP-over-WebSocket endpoint for chat-service (through the gateway).
			"/ws": {
				target: "http://localhost:8086",
				changeOrigin: true,
				ws: true,
			},
		},
	},
});
