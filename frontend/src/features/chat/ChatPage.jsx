import { useCallback, useEffect, useRef, useState } from "react";
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
import NewConversationModal from "./components/NewConversationModal";

// Trang tin nhắn mới nhất tải lần đầu; tin cũ hơn nạp theo yêu cầu.
const PAGE_SIZE = 30;

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
	const [msgPage, setMsgPage] = useState(1);
	const [hasOlder, setHasOlder] = useState(false);
	const [loadingOlder, setLoadingOlder] = useState(false);
	const [directConv, setDirectConv] = useState(null);
	const [composeOpen, setComposeOpen] = useState(false);
	const realtimeIdsRef = useRef(new Set());
	const conversationLoadsRef = useRef(new Set());
	const conversationsRef = useRef(conversations);
	conversationsRef.current = conversations;

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
	//
	// Dùng /messages/paginated thay vì /messages: endpoint không phân trang trả
	// về TOÀN BỘ lịch sử hội thoại trong một lượt, nên một cuộc trò chuyện dài
	// khiến lần mở đầu tiên tải hàng nghìn tin. Ở đây chỉ lấy trang mới nhất,
	// tin cũ hơn nạp theo yêu cầu.
	const loadMessages = useCallback(
		(cid, page = 1) =>
			api
				.get(endpoints.chat.messagesPaginated, {
					params: { conversationId: cid, page, size: PAGE_SIZE },
				})
				.then((res) => ({
					// data là mới-nhất-trước; giao diện render cũ-trước.
					asc: (res?.data ?? res?.content ?? [])
						.slice()
						.reverse()
						.map((m) => normalizeMessage(m, userId)),
					hasOlder: page < (res?.totalPages ?? 1),
				})),
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
		setMsgPage(1);
		setHasOlder(false);
		loadMessages(conversationId)
			.then(({ asc, hasOlder: more }) => {
				if (!alive) return;
				setMessages(asc);
				setHasOlder(more);
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
			if (body.id && realtimeIdsRef.current.has(body.id)) return;
			if (body.id) realtimeIdsRef.current.add(body.id);
			const msg = normalizeMessage(body, userId);
			const isActive = cid === conversationId;
			const preview = {
				lastMessage: msg.message,
				lastMessageMine: msg.me,
				lastMessageAt: msg.createdDate || new Date().toISOString(),
				unread: isActive || msg.me ? 0 : 1,
			};

			if (
				!conversationsRef.current.some((conversation) => conversation.id === cid) &&
				!conversationLoadsRef.current.has(cid)
			) {
				conversationLoadsRef.current.add(cid);
				api
					.get(endpoints.chat.conversationById(cid))
					.then((conversation) => {
						setConversations((prev) => {
							if (prev.some((item) => item.id === cid)) return prev;
							return [{ ...conversation, ...preview }, ...prev];
						});
					})
					.catch(() => {})
					.finally(() => conversationLoadsRef.current.delete(cid));
			}

			setConversations((prev) => {
				let found = false;
				const next = prev.map((c) => {
					if (c.id !== cid) return c;
					found = true;
					return {
						...c,
						...preview,
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

	const { connected } = useChatSocket({
		onMessage: handleSocketMessage,
	});

	// REST fallback polling for the open thread while the socket is down.
	useEffect(() => {
		if (!conversationId || connected) return undefined;
		const id = setInterval(() => {
			loadMessages(conversationId)
				.then(({ asc }) => setMessages((prev) => mergeAuthoritative(prev, asc)))
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

			// REST gives the sender a reliable acknowledgement; the backend also
			// pushes the saved message to every participant's private WebSocket queue.
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
		[conversationId, userId, meProfile, bumpPreview, toast],
	);

	// Sửa / xoá tin nhắn. Cập nhật ngay danh sách đang mở; các máy khác nhận được
	// qua lần tải lại kế tiếp — chat-service không phát sự kiện sửa/xoá lên
	// WebSocket, chỉ phát tin mới.
	const handleEditMessage = useCallback(
		async (message, text) => {
			try {
				const updated = await api.put(endpoints.chat.messageById(message.id), {
					message: text,
				});
				const normalized = normalizeMessage(updated, userId);
				setMessages((prev) => prev.map((m) => (m.id === message.id ? normalized : m)));
				setConversations((prev) =>
					prev.map((c) =>
						c.id === message.conversationId && c.lastMessage === message.message
							? { ...c, lastMessage: normalized.message }
							: c,
					),
				);
			} catch (e) {
				toast.error(e.message || "Không sửa được tin nhắn.");
				throw e;
			}
		},
		[userId, setConversations, toast],
	);

	const handleDeleteMessage = useCallback(
		async (message) => {
			try {
				await api.delete(endpoints.chat.messageById(message.id));
				setMessages((prev) => prev.filter((m) => m.id !== message.id));
			} catch (e) {
				toast.error(e.message || "Không xoá được tin nhắn.");
			}
		},
		[toast],
	);

	// Đổi tên / thêm / xoá thành viên đều trả về ConversationResponse mới.
	const handleConversationUpdated = useCallback(
		(updated) => {
			if (!updated?.id) return;
			setDirectConv((cur) => (cur?.id === updated.id ? { ...cur, ...updated } : cur));
			setConversations((prev) =>
				prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
			);
		},
		[setConversations],
	);

	// Rời / xoá hội thoại: gỡ khỏi danh sách rồi quay về hộp thư.
	const handleConversationGone = useCallback(() => {
		setConversations((prev) => prev.filter((c) => c.id !== conversationId));
		setDirectConv(null);
		navigate("/messages", { replace: true });
	}, [conversationId, setConversations, navigate]);

	const handleLoadOlder = useCallback(async () => {
		if (!conversationId || loadingOlder || !hasOlder) return;
		setLoadingOlder(true);
		try {
			const next = msgPage + 1;
			const { asc, hasOlder: more } = await loadMessages(conversationId, next);
			setMessages((prev) => {
				const known = new Set(prev.map((m) => m.id));
				return [...asc.filter((m) => !known.has(m.id)), ...prev];
			});
			setMsgPage(next);
			setHasOlder(more);
		} catch (e) {
			toast.error(e.message || "Không tải được tin nhắn cũ.");
		} finally {
			setLoadingOlder(false);
		}
	}, [conversationId, loadingOlder, hasOlder, msgPage, loadMessages, toast]);

	const onSelect = useCallback(
		(id) => navigate(`/messages/${id}`),
		[navigate],
	);
	const onBack = useCallback(() => navigate("/messages"), [navigate]);

	return (
		<div className="flex h-[calc(100dvh-60px)] bg-surface md:h-[100dvh]">
			{/* Left: conversation list */}
			<div
				className={cn(
					"h-full w-full shrink-0 border-r border-line md:w-[350px]",
					conversationId ? "hidden md:flex md:flex-col" : "flex flex-col",
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
					onCompose={() => setComposeOpen(true)}
				/>
			</div>

			{/* Right: chat thread */}
			<div
				className={cn(
					"h-full min-w-0",
					conversationId
						? "flex flex-1 flex-col"
						: "hidden flex-1 flex-col items-center justify-center md:flex",
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
								.then(({ asc, hasOlder: more }) => {
									setMsgError(null);
									setMessages(asc);
									setMsgPage(1);
									setHasOlder(more);
								})
								.catch((e) => setMsgError(e.message))
						}
						hasOlder={hasOlder}
						loadingOlder={loadingOlder}
						onLoadOlder={handleLoadOlder}
						onEditMessage={handleEditMessage}
						onDeleteMessage={handleDeleteMessage}
						onConversationUpdated={handleConversationUpdated}
						onConversationGone={handleConversationGone}
					/>
				) : (
					<EmptyState
						icon={ChatsCircle}
						title="Tin nhắn của bạn"
						description="Chọn một cuộc trò chuyện ở bên trái để bắt đầu nhắn tin."
					/>
				)}
			</div>

			<NewConversationModal
				open={composeOpen}
				onClose={() => setComposeOpen(false)}
				onCreated={(conversation) => {
					setComposeOpen(false);
					// DIRECT đã tồn tại sẽ được trả lại nguyên bản, nên chỉ thêm vào
					// danh sách khi thật sự chưa có.
					setConversations((prev) =>
						prev.some((c) => c.id === conversation.id) ? prev : [conversation, ...prev],
					);
					navigate(`/messages/${conversation.id}`);
				}}
			/>
		</div>
	);
}
