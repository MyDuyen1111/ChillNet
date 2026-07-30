import { useCallback, useEffect, useState } from "react";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

const LIMIT = 5;

// "Gợi ý cho bạn" rail. `GET /social/friendships/suggested` already returns
// profile-shaped rows (userId, username, avatar, ...), no enrichment needed.
export function useSuggestedFriends() {
	const [suggestions, setSuggestions] = useState([]);
	const [status, setStatus] = useState("loading"); // loading | ready | error

	const load = useCallback(async () => {
		setStatus("loading");
		try {
			const list = await api.get(endpoints.social.suggested);
			setSuggestions((list ?? []).slice(0, LIMIT));
			setStatus("ready");
		} catch {
			setStatus("error");
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const removeById = useCallback((userId) => {
		setSuggestions((prev) => prev.filter((p) => p.userId !== userId));
	}, []);

	return { suggestions, status, removeById };
}

export default useSuggestedFriends;
