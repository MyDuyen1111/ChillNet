import { useCallback, useEffect, useState } from "react";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";

// Friends of the current user, enriched with their profile (avatar, username).
// Feeds the story tray, capped at one page since it is a horizontal rail.
export function useFriends() {
	const { userId: me } = useAuth();
	const [friends, setFriends] = useState([]);
	const [status, setStatus] = useState("loading"); // loading | ready | error

	const load = useCallback(async () => {
		if (!me) return;
		setStatus("loading");
		try {
			const page = await api.get(endpoints.social.friends, {
				params: { page: 1, size: 20 },
			});
			const rows = page?.content ?? [];
			const ids = [...new Set(rows.map((r) => (r.userId === me ? r.friendId : r.userId)).filter(Boolean))];
			const settled = await Promise.allSettled(
				ids.map((id) => api.get(endpoints.profile.byId(id))),
			);
			const profiles = new Map();
			ids.forEach((id, i) => {
				if (settled[i].status === "fulfilled") profiles.set(id, settled[i].value);
			});
			setFriends(
				ids
					.map((id) => ({ userId: id, profile: profiles.get(id) ?? null }))
					.filter((f) => f.profile),
			);
			setStatus("ready");
		} catch {
			setStatus("error");
		}
	}, [me]);

	useEffect(() => {
		load();
	}, [load]);

	return { friends, status };
}

export default useFriends;
