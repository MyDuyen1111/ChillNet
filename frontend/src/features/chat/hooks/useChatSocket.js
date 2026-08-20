import "../globalShim"; // must precede sockjs-client so the `global` alias exists.
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";
import { tokenStore } from "../../../lib/api";

// The endpoint includes chat-service's servlet context path (`/chat`). Vite
// proxies it directly to the service so SockJS can use its HTTP transports too.
const WS_URL = "/chat/ws";

// Every authenticated account receives its messages on a private user queue.
// This also covers conversations created after the chat page was opened.
export default function useChatSocket({ onMessage }) {
	const [connected, setConnected] = useState(false);
	const clientRef = useRef(null);
	const messageSubRef = useRef(null);
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	useEffect(() => {
		const token = tokenStore.get();
		if (!token) return undefined;

		const client = new Client({
			webSocketFactory: () => new SockJS(WS_URL),
			connectHeaders: { Authorization: `Bearer ${token}` },
			reconnectDelay: 4000,
			heartbeatIncoming: 10000,
			heartbeatOutgoing: 10000,
			onConnect: () => {
				messageSubRef.current = client.subscribe("/user/queue/messages", (frame) => {
					let body;
					try {
						body = JSON.parse(frame.body);
					} catch {
						return;
					}
					if (body?.conversationId) {
						onMessageRef.current?.(body.conversationId, body);
					}
				});
				setConnected(true);
			},
			onWebSocketClose: () => {
				messageSubRef.current = null;
				setConnected(false);
			},
			onWebSocketError: () => setConnected(false),
			onStompError: () => setConnected(false),
		});

		clientRef.current = client;
		client.activate();

		return () => {
			try {
				messageSubRef.current?.unsubscribe();
			} catch {
				/* already disconnected */
			}
			messageSubRef.current = null;
			client.deactivate();
			clientRef.current = null;
			setConnected(false);
		};
	}, []);

	return { connected };
}
