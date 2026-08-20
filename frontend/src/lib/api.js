import axios from "axios";
import endpoints from "./endpoints";

// Single axios instance for the whole app. The Vite dev proxy forwards
// "/api/**" to the gateway at :8080, so we only ever use relative URLs.

const TOKEN_KEY = "chillnet-token";
const BASE_URL = "/api/v1";

export const tokenStore = {
	get: () => localStorage.getItem(TOKEN_KEY),
	set: (t) => localStorage.setItem(TOKEN_KEY, t),
	clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const http = axios.create({
	baseURL: BASE_URL,
	headers: { "Content-Type": "application/json" },
});

// identity-service phát token sống 1 giờ nhưng vẫn nhận đổi token trong 10 giờ
// kể từ lúc phát (jwt.refreshable-duration). Nhờ vậy một token đã hết hạn vẫn
// đổi được token mới mà không bắt đăng nhập lại.
//
// Gọi bằng axios trần chứ không qua `http`: request này phải nằm ngoài
// interceptor bên dưới, nếu không một lần refresh hỏng sẽ tự gọi lại chính nó.
let refreshPromise = null;

export function refreshSession() {
	if (refreshPromise) return refreshPromise; // gộp mọi request 401 cùng lúc vào một lần đổi token
	const token = tokenStore.get();
	if (!token) return Promise.reject(new Error("Chưa đăng nhập."));

	refreshPromise = axios
		.post(BASE_URL + endpoints.auth.refresh, { token })
		.then((res) => {
			const next = res.data?.result?.token;
			if (!next) throw new Error("Phiên đăng nhập đã hết hạn.");
			tokenStore.set(next);
			return next;
		})
		.finally(() => {
			refreshPromise = null;
		});

	return refreshPromise;
}

// Các route auth tự trả 401 khi sai mật khẩu / sai OTP. Đổi token ở đó là vô
// nghĩa và sẽ nuốt mất thông báo lỗi thật.
const isAuthRoute = (url = "") => url.includes("/identity/auth/");

// Attach the JWT on every request (the gateway introspects it edge-side).
http.interceptors.request.use((config) => {
	const token = tokenStore.get();
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

// Normalise the backend's ApiResponse envelope and error shape.
http.interceptors.response.use(
	(res) => res,
	async (error) => {
		const original = error.config;

		if (error.response?.status === 401) {
			// Token hết hạn là trường hợp thường gặp nhất: thử đổi token một lần
			// rồi phát lại đúng request đó. `_retry` chặn vòng lặp nếu request
			// phát lại cũng 401.
			if (original && !original._retry && !isAuthRoute(original.url)) {
				original._retry = true;
				try {
					const token = await refreshSession();
					// Gán trực tiếp thay vì spread: `headers` là AxiosHeaders,
					// sao chép nông sẽ làm mất phần xử lý Content-Type của
					// request multipart.
					original.headers.Authorization = `Bearer ${token}`;
					return await http(original);
				} catch {
					// Đổi token thất bại → rơi xuống nhánh đăng xuất bên dưới.
				}
			}

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
