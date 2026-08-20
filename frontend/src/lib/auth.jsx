import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import api, { refreshSession, tokenStore } from "./api";
import endpoints from "./endpoints";

// Decode a JWT payload without verifying it (verification is the gateway's job).
// identity-service sets `subject` = userId and `scope` = space-delimited roles.
function decodeToken(token) {
	try {
		const payload = JSON.parse(
			atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
		);
		const expired = payload.exp && payload.exp * 1000 < Date.now();
		if (expired) return null;
		return {
			id: payload.sub,
			roles: (payload.scope || "").split(" ").filter(Boolean),
		};
	} catch {
		return null;
	}
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null); // { id, roles, profile? }
	const [booting, setBooting] = useState(true);

	// Best-effort profile enrichment so the shell can show a name + avatar.
	const enrich = useCallback(async (base) => {
		try {
			const profile = await api.get(endpoints.profile.myProfile);
			return { ...base, profile };
		} catch {
			return base;
		}
	}, []);

	const hydrate = useCallback(async () => {
		const token = tokenStore.get();
		let claims = token && decodeToken(token);

		// Token còn đó nhưng đã quá hạn 1 giờ: identity-service vẫn đổi được nó
		// trong 10 giờ kể từ lúc phát, nên thử đổi trước khi coi như mất phiên.
		// Đây là lý do đóng tab qua đêm rồi mở lại không bị đá ra màn đăng nhập.
		if (token && !claims) {
			try {
				claims = decodeToken(await refreshSession());
			} catch {
				claims = null;
			}
		}

		if (!claims) {
			tokenStore.clear();
			setUser(null);
			setBooting(false);
			return;
		}
		setUser(await enrich(claims));
		setBooting(false);
	}, [enrich]);

	useEffect(() => {
		hydrate();
		const onUnauthorized = () => setUser(null);
		window.addEventListener("chillnet-unauthorized", onUnauthorized);
		return () =>
			window.removeEventListener("chillnet-unauthorized", onUnauthorized);
	}, [hydrate]);

	const login = useCallback(
		async ({ username, password }) => {
			const { token } = await api.post(endpoints.auth.token, {
				username,
				password,
			});
			tokenStore.set(token);
			const claims = decodeToken(token);
			if (!claims) throw new Error("Token không hợp lệ.");
			setUser(await enrich(claims));
		},
		[enrich],
	);

	const register = useCallback(async (payload) => {
		// Returns the created user. Email verification may be required before the
		// account can obtain a token, so we do not auto-login here.
		return api.post(endpoints.auth.register, payload);
	}, []);

	const logout = useCallback(async () => {
		// Ghi token vào bảng invalidated_token của identity-service. Không có
		// bước này thì JWT vẫn hợp lệ đến khi hết hạn: ai copy được token trước
		// lúc đăng xuất vẫn dùng tiếp được cả tiếng.
		const token = tokenStore.get();
		// Xoá phiên trước rồi mới gọi API: nếu mạng hỏng, người dùng vẫn phải
		// được đăng xuất khỏi máy này.
		tokenStore.clear();
		setUser(null);
		if (!token) return;
		try {
			await api.post(endpoints.auth.logout, { token });
		} catch {
			// Token có thể đã hết hạn / bị revoke sẵn — không có gì để báo.
		}
	}, []);

	const refreshProfile = useCallback(async () => {
		setUser((prev) => (prev ? { ...prev } : prev));
		const claims = tokenStore.get() && decodeToken(tokenStore.get());
		if (claims) setUser(await enrich(claims));
	}, [enrich]);

	const value = useMemo(
		() => ({
			user,
			userId: user?.id ?? null,
			booting,
			isAuthenticated: !!user,
			login,
			register,
			logout,
			refreshProfile,
		}),
		[user, booting, login, register, logout, refreshProfile],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
	return ctx;
}
