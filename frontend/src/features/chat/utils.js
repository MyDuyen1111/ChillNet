// Pure helpers for the chat feature. Kept dependency-free so components stay thin.

// Backend forces `me = false` on WebSocket broadcasts, so we always re-derive
// ownership from the sender id instead of trusting the flag.
export function normalizeMessage(msg, userId) {
	return { ...msg, me: !!(msg?.sender?.userId && msg.sender.userId === userId) };
}

// Display name for a ParticipantInfo (mirrors backend getDisplayName logic).
export function participantName(p) {
	if (!p) return "Người dùng";
	const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
	return full || p.username || "Người dùng";
}

export function isGroup(conv) {
	return conv?.typeConversation === "GROUP";
}

// For DIRECT the backend already puts the other person's name in
// `conversationName`; for GROUP without a name we build one from participants.
export function conversationTitle(conv, currentUserId) {
	if (!conv) return "Cuộc trò chuyện";
	if (conv.conversationName) return conv.conversationName;
	const others = (conv.participants || []).filter((p) => p.userId !== currentUserId);
	if (others.length) return others.map(participantName).slice(0, 3).join(", ");
	return "Cuộc trò chuyện";
}

export function conversationAvatar(conv) {
	return conv?.conversationAvatar || undefined;
}

// The other person in a DIRECT thread (used by the profile-intro block at the
// top of a conversation). Groups have no single "other person", so null.
export function otherParticipant(conv, currentUserId) {
	if (!conv || isGroup(conv)) return null;
	return (conv.participants || []).find((p) => p.userId !== currentUserId) || null;
}

// Short clock time for a message bubble ("14:05").
export function formatClock(value) {
	if (!value) return "";
	try {
		return new Date(value).toLocaleTimeString("vi-VN", {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
}

// Abbreviated relative time for the conversation list row ("5 phút", "2 ngày"),
// Instagram-style (no "trước" suffix).
export function shortTimeAgo(value) {
	if (!value) return "";
	try {
		const diff = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
		const steps = [
			[60, 1, "giây"],
			[3600, 60, "phút"],
			[86400, 3600, "giờ"],
			[604800, 86400, "ngày"],
			[2629800, 604800, "tuần"],
			[31557600, 2629800, "tháng"],
			[Infinity, 31557600, "năm"],
		];
		for (const [limit, unit, label] of steps) {
			if (diff < limit) return `${Math.max(1, Math.floor(diff / unit))} ${label}`;
		}
		return "";
	} catch {
		return "";
	}
}

// Divider label shown between message clusters that are far apart in time
// ("14:05" hôm nay, "12 tháng 3, 14:05" ngày khác).
export function formatDivider(value) {
	if (!value) return "";
	try {
		const d = new Date(value);
		const now = new Date();
		const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
		if (d.toDateString() === now.toDateString()) return time;
		const sameYear = d.getFullYear() === now.getFullYear();
		const datePart = d.toLocaleDateString(
			"vi-VN",
			sameYear
				? { day: "numeric", month: "long" }
				: { day: "numeric", month: "long", year: "numeric" },
		);
		return `${datePart}, ${time}`;
	} catch {
		return "";
	}
}

// Merge an incoming message into the ascending list, de-duplicating by id and
// reconciling an optimistic (pending) copy of my own message with its server echo.
export function reconcileMessage(list, incoming, userId) {
	const me = !!(incoming?.sender?.userId && incoming.sender.userId === userId);
	const normalized = { ...incoming, me };
	if (normalized.id && list.some((m) => m.id === normalized.id)) return list;
	if (me) {
		const idx = list.findIndex((m) => m.pending && m.message === normalized.message);
		if (idx !== -1) {
			const copy = list.slice();
			copy[idx] = { ...normalized, pending: false };
			return copy;
		}
	}
	return [...list, normalized];
}

// Hợp nhất trang tin mới nhất từ server vào danh sách đang hiển thị.
//
// Từ khi luồng chat dùng /messages/paginated, `serverAsc` chỉ là TRANG ĐẦU
// (những tin mới nhất) — nếu thay thế cả danh sách như trước thì mọi tin cũ đã
// tải thêm sẽ biến mất mỗi lần polling chạy. Vì vậy: hợp nhất theo id, giữ
// nguyên tin cũ, và giữ lại tin optimistic chưa được server xác nhận.
//
// Hệ quả có ý thức: tin do người khác xoá sẽ không tự biến mất, vì "không có
// trong trang này" và "đã bị xoá" là hai chuyện không phân biệt được ở đây.
export function mergeAuthoritative(prev, serverAsc) {
	const server = new Map(serverAsc.map((m) => [m.id, m]));
	const confirmedMine = new Set(serverAsc.filter((m) => m.me).map((m) => m.message));

	const merged = prev
		.filter((m) => !(m.pending && confirmedMine.has(m.message)))
		.map((m) => (m.pending ? m : (server.get(m.id) ?? m)));

	const known = new Set(merged.map((m) => m.id));
	const added = serverAsc.filter((m) => !known.has(m.id));

	return [...merged, ...added].sort(
		(a, b) => new Date(a.createdDate || 0) - new Date(b.createdDate || 0),
	);
}

// A locally-created message shown immediately while the send is in flight.
export function makeOptimisticMessage(text, userId, profile, conversationId) {
	return {
		id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		conversationId,
		message: text,
		me: true,
		pending: true,
		sender: {
			userId,
			username: profile?.username,
			firstName: profile?.firstName,
			lastName: profile?.lastName,
			avatar: profile?.avatar,
		},
		createdDate: new Date().toISOString(),
	};
}

// Id của tin nhắn cuối cùng do chính mình gửi và đã được server xác nhận.
//
// Dòng "Đã xem" chỉ bám vào đúng tin này. Mỗi tin muốn biết trạng thái đã xem
// là một lượt GET /messages/{id}/read-receipts, nên gắn cho mọi bong bóng sẽ
// biến một lần mở hội thoại thành hàng chục request. Tin optimistic bị loại vì
// id "temp-..." của nó chưa tồn tại ở backend.
export function lastOwnMessageId(messages) {
	for (let i = (messages?.length ?? 0) - 1; i >= 0; i -= 1) {
		const m = messages[i];
		if (m?.me && !m.pending && m.id) return m.id;
	}
	return null;
}
