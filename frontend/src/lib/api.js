import axios from "axios";

// Single axios instance for the whole app. The Vite dev proxy forwards
// "/api/**" to the gateway at :8080, so we only ever use relative URLs.

const TOKEN_KEY = "chillnet-token";

export const tokenStore = {
	get: () => localStorage.getItem(TOKEN_KEY),
	set: (t) => localStorage.setItem(TOKEN_KEY, t),
	clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const http = axios.create({
	baseURL: "/api/v1",
	headers: { "Content-Type": "application/json" },
});

// Attach the JWT on every request (the gateway introspects it edge-side).
http.interceptors.request.use((config) => {
	const token = tokenStore.get();
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// Normalise the backend's ApiResponse envelope and error shape.
http.interceptors.response.use(
	(res) => res,
	(error) => {
		if (error.response?.status === 401) {
			// Token missing / rejected by the gateway. Drop the session and let
			// AuthContext react (it listens for this event) rather than importing
			// router state into this low-level module.
			tokenStore.clear();
			window.dispatchEvent(new CustomEvent("chillnet-unauthorized"));
		}
		const data = error.response?.data;
		const message =
			data?.message || error.message || "Đã có lỗi xảy ra, thử lại sau.";
		const normalised = new Error(message);
		normalised.code = data?.code;
		normalised.status = error.response?.status;
		return Promise.reject(normalised);
	},
);

// Each backend service ships its OWN copy of PageResponse and they disagree on
// the field names: post/group/chat/social use `{ currentPage, pageSize, data[] }`
// (no hasNext), while notification/interaction use `{ page, size, content[],
// hasNext, hasPrevious }`. Normalise both into a single shape so feature code can
// always read `.content` / `.data` / `.hasNext` regardless of which service answered.
function normalizePage(result) {
	if (!result || typeof result !== "object" || result.totalPages === undefined) {
		return result;
	}
	const list = Array.isArray(result.content)
		? result.content
		: Array.isArray(result.data)
			? result.data
			: null;
	if (list === null) return result;
	const page = result.page ?? result.currentPage ?? 1;
	const totalPages = result.totalPages ?? 1;
	return {
		...result,
		content: list,
		data: list,
		page,
		size: result.size ?? result.pageSize,
		hasNext: typeof result.hasNext === "boolean" ? result.hasNext : page < totalPages,
		hasPrevious:
			typeof result.hasPrevious === "boolean" ? result.hasPrevious : page > 1,
	};
}

// Convenience wrappers that unwrap `ApiResponse.result` (and normalise pages).
function unwrap(promise) {
	return promise.then((res) => normalizePage(res.data?.result ?? res.data));
}

export const api = {
	get: (url, config) => unwrap(http.get(url, config)),
	post: (url, body, config) => unwrap(http.post(url, body, config)),
	put: (url, body, config) => unwrap(http.put(url, body, config)),
	patch: (url, body, config) => unwrap(http.patch(url, body, config)),
	delete: (url, config) => unwrap(http.delete(url, config)),
	// Raw variants when a caller needs the full envelope or headers.
	raw: http,
};

// Multipart helper: builds FormData and lets the browser set the boundary.
export function toFormData(fields) {
	const fd = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		if (value == null) continue;
		if (Array.isArray(value)) value.forEach((v) => fd.append(key, v));
		else fd.append(key, value);
	}
	return fd;
}

export default api;
