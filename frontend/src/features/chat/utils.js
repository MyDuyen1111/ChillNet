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

// When polling replaces the thread with the authoritative server list, keep any
// still-unconfirmed optimistic messages so they do not flicker out mid-send.
export function mergeAuthoritative(prev, serverAsc) {
	const pending = prev.filter((m) => m.pending);
	if (!pending.length) return serverAsc;
	const confirmedMine = new Set(serverAsc.filter((m) => m.me).map((m) => m.message));
	const stillPending = pending.filter((p) => !confirmedMine.has(p.message));
	return [...serverAsc, ...stillPending];
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
