import { useCallback, useEffect, useState } from "react";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

// myConversations returns only participant metadata, so we enrich each
// conversation with its last message + unread count (the list needs both) and
// order them by most recent activity.
export default function useConversations(userId) {
	const [conversations, setConversations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		try {
			setError(null);
			const list = await api.get(endpoints.chat.myConversations);
			const base = Array.isArray(list) ? list : [];

			const enriched = await Promise.all(
				base.map(async (conv) => {
					const [msgs, unread] = await Promise.all([
						api
							.get(endpoints.chat.messages, {
								params: { conversationId: conv.id },
							})
							.catch(() => []),
						api
							.get(endpoints.chat.unreadCount, {
								params: { conversationId: conv.id },
							})
							.catch(() => 0),
					]);
					// getMessages returns newest-first, so index 0 is the latest.
					const last = Array.isArray(msgs) && msgs.length ? msgs[0] : null;
					return {
						...conv,
						lastMessage: last?.message ?? null,
						lastMessageMine: last ? last.sender?.userId === userId : false,
						lastMessageAt:
							last?.createdDate ?? conv.modifiedDate ?? conv.createdDate,
						unread: typeof unread === "number" ? unread : 0,
					};
				}),
			);

			enriched.sort(
				(a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
			);
			setConversations(enriched);
		} catch (e) {
			setError(e.message || "Không tải được danh sách trò chuyện.");
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		load();
	}, [load]);

	return { conversations, setConversations, loading, error, reload: load };
}
