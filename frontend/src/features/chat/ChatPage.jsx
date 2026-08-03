import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatsCircle } from "@phosphor-icons/react";
import { EmptyState, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/cn";
import useConversations from "./hooks/useConversations";
import useChatSocket from "./hooks/useChatSocket";
import {
	makeOptimisticMessage,
	mergeAuthoritative,
	normalizeMessage,
	reconcileMessage,
} from "./utils";
import ConversationList from "./components/ConversationList";
import ChatWindow from "./components/ChatWindow";

export default function ChatPage() {
	const { conversationId } = useParams();
	const navigate = useNavigate();
	const toast = useToast();
	const { userId, user } = useAuth();
	const meProfile = user?.profile;

	const {
		conversations,
		setConversations,
		loading: convLoading,
		error: convError,
		reload: reloadConversations,
	} = useConversations(userId);

	const [messages, setMessages] = useState([]);
	const [msgLoading, setMsgLoading] = useState(false);
	const [msgError, setMsgError] = useState(null);
	const [directConv, setDirectConv] = useState(null);

	// Fetch a conversation opened via deep link before the list has loaded it.
	useEffect(() => {
		if (!conversationId) {
			setDirectConv(null);
			return undefined;
		}
		if (conversations.some((c) => c.id === conversationId)) return undefined;
		let alive = true;
		api
			.get(endpoints.chat.conversationById(conversationId))
			.then((c) => alive && setDirectConv(c))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [conversationId, conversations]);

	const activeConv =
		conversations.find((c) => c.id === conversationId) ||
		(directConv?.id === conversationId ? directConv : null);

	// Load the thread whenever the active conversation changes.
	const loadMessages = useCallback(
		(cid) =>
			api
				.get(endpoints.chat.messages, { params: { conversationId: cid } })
				.then((list) =>
					(Array.isArray(list) ? list : [])
						.slice()
						.reverse() // getMessages is newest-first; we render oldest-first.
						.map((m) => normalizeMessage(m, userId)),
				),
		[userId],
	);

	useEffect(() => {
		if (!conversationId) {
			setMessages([]);
			return undefined;
		}
		let alive = true;
		setMsgLoading(true);
		setMsgError(null);
		loadMessages(conversationId)
			.then((asc) => {
				if (!alive) return;
				setMessages(asc);
				// Best-effort mark-as-read for the latest incoming message + clear badge.
				const incoming = asc.filter((m) => !m.me && !m.pending);
				const latest = incoming[incoming.length - 1];
				if (latest?.id) {
					api.post(endpoints.chat.readMessage(latest.id)).catch(() => {});
				}
				setConversations((prev) =>
					prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
				);
			})
			.catch((e) => alive && setMsgError(e.message || "Không tải được tin nhắn."))
			.finally(() => alive && setMsgLoading(false));
		return () => {
			alive = false;
		};
	}, [conversationId, loadMessages, setConversations]);

	// Realtime: append incoming messages + refresh the list preview/ordering.
	const handleSocketMessage = useCallback(
		(cid, body) => {
			// Ignore JOIN/LEAVE notifications (string sender, no message text).
			if (
				!body ||
				typeof body.message !== "string" ||
				typeof body.sender !== "object" ||
				body.sender === null
			) {
				return;
			}
			const msg = normalizeMessage(body, userId);

			setConversations((prev) => {
				let found = false;
				const next = prev.map((c) => {
					if (c.id !== cid) return c;
					found = true;
					const isActive = cid === conversationId;
					return {
						...c,
						lastMessage: msg.message,
						lastMessageMine: msg.me,
						lastMessageAt: msg.createdDate || new Date().toISOString(),
						unread: isActive || msg.me ? 0 : (c.unread ?? 0) + 1,
					};
				});
				if (!found) return prev;
				next.sort(
					(a, b) =>
						new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
				);
				return next;
			});

			if (cid === conversationId) {
				setMessages((prev) => reconcileMessage(prev, msg, userId));
				if (!msg.me && msg.id) {
					api.post(endpoints.chat.readMessage(msg.id)).catch(() => {});
				}
			}
		},
		[conversationId, userId, setConversations],
	);

	const conversationIds = conversations.map((c) => c.id);
	const { connected, sendMessage } = useChatSocket({
		conversationIds,
		onMessage: handleSocketMessage,
	});

	// REST fallback polling for the open thread while the socket is down.
	useEffect(() => {
		if (!conversationId || connected) return undefined;
		const id = setInterval(() => {
			loadMessages(conversationId)
				.then((asc) => setMessages((prev) => mergeAuthoritative(prev, asc)))
				.catch(() => {});
		}, 3000);
		return () => clearInterval(id);
	}, [conversationId, connected, loadMessages]);

	const bumpPreview = useCallback(
		(cid, text) => {
			setConversations((prev) => {
				const next = prev.map((c) =>
					c.id === cid
						? {
								...c,
								lastMessage: text,
								lastMessageMine: true,
								lastMessageAt: new Date().toISOString(),
								unread: 0,
							}
						: c,
				);
				next.sort(
					(a, b) =>
						new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
				);
				return next;
			});
		},
		[setConversations],
	);

	const handleSend = useCallback(
		async (text) => {
			if (!conversationId) return;
			const optimistic = makeOptimisticMessage(
				text,
				userId,
				meProfile,
				conversationId,
			);
			setMessages((prev) => [...prev, optimistic]);
			bumpPreview(conversationId, text);

			// Prefer WebSocket; the server echoes the message back on the topic and
			// reconcileMessage swaps the optimistic copy for the real one.
			if (connected && sendMessage(conversationId, text)) return;

			// Socket unavailable: persist over REST and reconcile with the response.
			try {
				const saved = await api.post(endpoints.chat.messages, {
					conversationId,
					message: text,
				});
				setMessages((prev) =>
					reconcileMessage(prev, normalizeMessage(saved, userId), userId),
				);
			} catch (e) {
				setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
				toast.error(e.message || "Gửi tin nhắn thất bại.");
			}
		},
		[conversationId, userId, meProfile, connected, sendMessage, bumpPreview, toast],
	);

	const onSelect = useCallback(
		(id) => navigate(`/messages/${id}`),
		[navigate],
	);
	const onBack = useCallback(() => navigate("/messages"), [navigate]);

	return (
		<div className="mx-auto h-[calc(100dvh-11.5rem)] w-full max-w-6xl overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:h-[calc(100dvh-8rem)]">
			<div className="flex h-full">
				{/* Left: conversation list */}
				<div
					className={cn(
						"h-full w-full shrink-0 border-zinc-200 dark:border-zinc-800 lg:w-80 lg:border-r xl:w-96",
						conversationId ? "hidden lg:block" : "block",
					)}
				>
					<ConversationList
						conversations={conversations}
						activeId={conversationId}
						loading={convLoading}
						error={convError}
						currentUserId={userId}
						onSelect={onSelect}
						onRetry={reloadConversations}
					/>
				</div>

				{/* Right: chat thread */}
				<div
					className={cn(
						"h-full min-w-0 flex-1",
						conversationId ? "block" : "hidden lg:block",
					)}
				>
					{conversationId ? (
						<ChatWindow
							conversation={activeConv}
							conversationId={conversationId}
							messages={messages}
							loading={msgLoading}
							error={msgError}
							connected={connected}
							currentUserId={userId}
							onSend={handleSend}
							onBack={onBack}
							onRetry={() =>
								loadMessages(conversationId)
									.then((asc) => {
										setMsgError(null);
										setMessages(asc);
									})
									.catch((e) => setMsgError(e.message))
							}
						/>
					) : (
						<div className="flex h-full items-center justify-center">
							<EmptyState
								icon={ChatsCircle}
								title="Tin nhắn của bạn"
								description="Chọn một cuộc trò chuyện ở bên trái để bắt đầu nhắn tin."
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
