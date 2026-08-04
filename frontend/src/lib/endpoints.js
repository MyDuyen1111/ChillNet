// Central map of every gateway route the web client uses.
//
// The axios instance (lib/api.js) already prefixes `/api/v1`, so paths here are
// written WITHOUT it: `svc("post", "/feed")` -> "/post/feed" -> the client hits
// "/api/v1/post/feed". Keep all URL strings in this one file so feature modules
// never hand-assemble paths (and never drift apart).

const svc = (service, path) => `/${service}${path}`;

export const endpoints = {
	// ---- identity-service (auth + accounts) ----
	auth: {
		register: svc("identity", "/auth/registration"),
		verifyUser: svc("identity", "/auth/verify-user"),
		resendVerification: svc("identity", "/auth/resend-verification"),
		token: svc("identity", "/auth/token"),
		refresh: svc("identity", "/auth/refresh"),
		logout: svc("identity", "/auth/logout"),
		forgotPassword: svc("identity", "/auth/forgot-password"),
		resetPassword: svc("identity", "/auth/reset-password"),
		myInfo: svc("identity", "/users/myInfo"),
		changePassword: svc("identity", "/users/change-password"),
	},

	// ---- profile-service ----
	profile: {
		myProfile: svc("profile", "/users/my-profile"),
		updateMyProfile: svc("profile", "/users/my-profile"),
		byId: (id) => svc("profile", `/users/${id}`),
		search: svc("profile", "/users/search"),
		avatar: svc("profile", "/users/avatar"),
		background: svc("profile", "/users/background"),
	},

	// ---- post-service ----
	post: {
		create: svc("post", "/create"), // multipart (content + images[])
		createJson: svc("post", "/json"), // json (content only)
		feed: svc("post", "/feed"),
		public: svc("post", "/public"),
		myPosts: svc("post", "/my-posts"),
		byId: (id) => svc("post", `/${id}`),
		update: (id) => svc("post", `/${id}`), // multipart
		updateJson: (id) => svc("post", `/${id}/json`),
		remove: (id) => svc("post", `/${id}`),
		byUser: (userId) => svc("post", `/user/${userId}`),
		byGroup: (groupId) => svc("post", `/group/${groupId}`),
		search: svc("post", "/search"),
		save: (id) => svc("post", `/save/${id}`),
		unsave: (id) => svc("post", `/unsave/${id}`),
		savedPosts: svc("post", "/saved-posts"),
		isSaved: (id) => svc("post", `/is-saved/${id}`),
		share: (id) => svc("post", `/share/${id}`),
	},

	// ---- interaction-service (likes + comments) ----
	interaction: {
		likes: svc("interaction", "/likes"),
		unlike: (id) => svc("interaction", `/likes/${id}`),
		unlikePost: (postId) => svc("interaction", `/likes/post/${postId}`),
		unlikeComment: (commentId) => svc("interaction", `/likes/comment/${commentId}`),
		likesByPost: (postId) => svc("interaction", `/likes/post/${postId}`),
		comments: svc("interaction", "/comments"),
		commentsByPost: (postId) => svc("interaction", `/comments/post/${postId}`),
		commentById: (id) => svc("interaction", `/comments/${id}`),
		replies: (id) => svc("interaction", `/comments/${id}/replies`),
	},

	// ---- social-service (friends / follow / block) ----
	social: {
		sendFriendRequest: (friendId) => svc("social", `/friendships/${friendId}`),
		acceptFriend: (friendId) => svc("social", `/friendships/${friendId}/accept`),
		rejectFriend: (friendId) => svc("social", `/friendships/${friendId}/reject`),
		removeFriend: (friendId) => svc("social", `/friendships/${friendId}`),
		cancelRequest: (friendId) => svc("social", `/friendships/${friendId}/cancel`),
		friends: svc("social", "/friendships/friends"),
		sentRequests: svc("social", "/friendships/sent-requests"),
		receivedRequests: svc("social", "/friendships/received-requests"),
		suggested: svc("social", "/friendships/suggested"),
		friendStatus: (friendId) => svc("social", `/friendships/status/${friendId}`),
		mutual: (friendId) => svc("social", `/friendships/mutual/${friendId}`),
		counts: svc("social", "/friendships/counts"),
		follow: (userId) => svc("social", `/follows/${userId}`),
		unfollow: (userId) => svc("social", `/follows/${userId}`),
		following: (userId) => svc("social", `/follows/following/${userId}`),
		followers: (userId) => svc("social", `/follows/followers/${userId}`),
		followInfo: (userId) => svc("social", `/follows/info/${userId}`),
		block: (userId) => svc("social", `/blocks/${userId}`),
		unblock: (userId) => svc("social", `/blocks/${userId}`),
		blocks: svc("social", "/blocks"),
	},

	// ---- chat-service ----
	chat: {
		conversations: svc("chat", "/conversations"),
		myConversations: svc("chat", "/conversations/my-conversations"),
		conversationById: (id) => svc("chat", `/conversations/${id}`),
		leaveConversation: (id) => svc("chat", `/conversations/${id}/leave`),
		messages: svc("chat", "/messages"),
		messagesPaginated: svc("chat", "/messages/paginated"),
		messageById: (id) => svc("chat", `/messages/${id}`),
		readMessage: (id) => svc("chat", `/messages/${id}/read`),
		unreadCount: svc("chat", "/messages/unread-count"),
	},

	// ---- group-service ----
	group: {
		groups: svc("group", "/groups"),
		byId: (id) => svc("group", `/groups/${id}`),
		update: (id) => svc("group", `/groups/${id}`),
		remove: (id) => svc("group", `/groups/${id}`),
		avatar: (id) => svc("group", `/groups/${id}/avatar`),
		cover: (id) => svc("group", `/groups/${id}/cover`),
		members: (id) => svc("group", `/groups/${id}/members`),
		join: (id) => svc("group", `/groups/${id}/join`),
		leave: (id) => svc("group", `/groups/${id}/leave`),
		joinRequests: (id) => svc("group", `/groups/${id}/join-requests`),
		myGroups: svc("group", "/groups/my-groups"),
		joinedGroups: svc("group", "/groups/joined-groups"),
		search: svc("group", "/groups/search"),
	},

	// ---- notification-service ----
	notification: {
		list: svc("notification", "/notifications"),
		markRead: (id) => svc("notification", `/notifications/${id}/read`),
		markAllRead: svc("notification", "/notifications/read-all"),
		unreadCount: svc("notification", "/notifications/unread-count"),
	},

	// ---- file-service (used indirectly; posts/profile upload via their own service) ----
	file: {
		uploadFormData: svc("file", "/images/upload-form-data"),
	},

	// ---- ai-service (content moderation) ----
	// Server-side moderation already runs on post/comment create and rejects with a
	// CONTENT_VIOLATION message. This endpoint lets the composer pre-check a draft.
	ai: {
		moderate: svc("ai", "/moderations/check"),
	},
};

export default endpoints;
