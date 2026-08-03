import "../globalShim"; // must precede sockjs-client so the `global` alias exists.
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { tokenStore } from "../../../lib/api";

// Path is proxied by Vite to chat-service :8086 (see vite.config.js). The STOMP
// endpoint is registered with withSockJS(), so we connect through SockJS.
const WS_URL = "/ws";

// Manages a single STOMP-over-WebSocket connection and keeps subscriptions in
// sync with the caller's conversation ids. Returns { connected, sendMessage }.
// `connected === false` is the caller's cue to fall back to REST polling.
export default function useChatSocket({ conversationIds = [], onMessage }) {
	const [connected, setConnected] = useState(false);
	const clientRef = useRef(null);
	const subsRef = useRef(new Map()); // conversationId -> StompSubscription
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	// Stable primitive so the subscribe effect only reruns when the set changes.
	const idsKey = conversationIds.filter(Boolean).slice().sort().join(",");

	const resubscribe = useCallback(() => {
		const client = clientRef.current;
		if (!client || !client.connected) return;
		const wanted = new Set(idsKey ? idsKey.split(",") : []);

		// Drop subscriptions for conversations we no longer track.
		subsRef.current.forEach((sub, id) => {
			if (!wanted.has(id)) {
				try {
					sub.unsubscribe();
				} catch {
					/* already gone */
				}
				subsRef.current.delete(id);
			}
		});

		// Add subscriptions for new conversations.
		wanted.forEach((id) => {
			if (subsRef.current.has(id)) return;
			const sub = client.subscribe(`/topic/conversation/${id}`, (frame) => {
				let body;
				try {
					body = JSON.parse(frame.body);
				} catch {
					return;
				}
				onMessageRef.current?.(id, body);
			});
			subsRef.current.set(id, sub);
		});
	}, [idsKey]);

	// Create the client once; it survives conversation switches.
	useEffect(() => {
		const token = tokenStore.get();
		if (!token) return undefined;

		const client = new Client({
			webSocketFactory: () => new SockJS(WS_URL),
			connectHeaders: { Authorization: `Bearer ${token}` },
			reconnectDelay: 4000,
			heartbeatIncoming: 10000,
			heartbeatOutgoing: 10000,
			onConnect: () => setConnected(true),
			onWebSocketClose: () => setConnected(false),
			onWebSocketError: () => setConnected(false),
			onStompError: () => setConnected(false),
		});

		clientRef.current = client;
		client.activate();

		return () => {
			subsRef.current.forEach((sub) => {
				try {
					sub.unsubscribe();
				} catch {
					/* ignore */
				}
			});
			subsRef.current.clear();
			client.deactivate();
			clientRef.current = null;
			setConnected(false);
		};
	}, []);

	// Reconcile subscriptions whenever the id set changes or we (re)connect.
	useEffect(() => {
		resubscribe();
	}, [resubscribe, connected]);

	const sendMessage = useCallback((conversationId, message) => {
		const client = clientRef.current;
		if (!client || !client.connected) return false;
		client.publish({
			destination: "/app/chat.sendMessage",
			body: JSON.stringify({ conversationId, message }),
		});
		return true;
	}, []);

	return { connected, sendMessage };
}
