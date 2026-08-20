import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const portFromEnv = (env, name, fallback) => {
	const port = Number.parseInt(env[name], 10);
	return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
};

// The shared .env lives one level above the frontend directory. Reading it here
// keeps Vite's dev port and proxy targets aligned with the backend launch scripts.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, "..", "");
	const frontendPort = portFromEnv(env, "FRONTEND_PORT", 5174);
	const apiGatewayPort = portFromEnv(env, "API_GATEWAY_PORT", 8080);
	const chatServicePort = portFromEnv(env, "CHAT_SERVICE_PORT", 8086);

	return {
		plugins: [react(), tailwindcss()],
		// These two are reached only from the lazy chat chunk, so Vite's dep scanner
		// misses them at startup and re-optimises the first time /messages is opened.
		// That invalidates the hash on the chunks the page already holds and the lazy
		// import rejects, blanking the app. Pre-bundling them up front avoids it.
		optimizeDeps: {
			include: ["sockjs-client", "@stomp/stompjs"],
		},
		server: {
			port: frontendPort,
			proxy: {
				"/api": {
					target: env.API_GATEWAY_URL ?? `http://localhost:${apiGatewayPort}`,
					changeOrigin: true,
				},
				// SockJS endpoint includes chat-service's servlet context path.
				"/chat/ws": {
					target: env.CHAT_SERVICE_URL ?? `http://localhost:${chatServicePort}`,
					changeOrigin: true,
					ws: true,
				},
			},
		},
	};
});
