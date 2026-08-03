import { useCallback, useEffect, useState } from "react";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

const PAGE_SIZE = 10;

// Loads the paginated feed (`GET /post/feed?page=&size=`) and exposes helpers so
// the composer can prepend a fresh post and a card can remove a deleted one
// without a full refetch. Page numbers start at 1 (backend convention).
export function useFeed() {
	const [posts, setPosts] = useState([]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [status, setStatus] = useState("loading"); // loading | ready | error
	const [loadingMore, setLoadingMore] = useState(false);

	const load = useCallback(async (targetPage) => {
		const first = targetPage === 1;
		if (first) setStatus("loading");
		else setLoadingMore(true);
		try {
			const result = await api.get(endpoints.post.feed, {
				params: { page: targetPage, size: PAGE_SIZE },
			});
			const content = result?.content ?? [];
			setPosts((prev) => {
				if (first) return content;
				// Dedupe against anything already on screen (e.g. a just-posted item).
				const seen = new Set(prev.map((p) => p.id));
				return [...prev, ...content.filter((p) => !seen.has(p.id))];
			});
			setHasNext(Boolean(result?.hasNext));
			setPage(targetPage);
			setStatus("ready");
		} catch {
			if (first) setStatus("error");
		} finally {
			setLoadingMore(false);
		}
	}, []);

	useEffect(() => {
		load(1);
	}, [load]);

	const loadMore = useCallback(() => {
		if (loadingMore || !hasNext) return;
		load(page + 1);
	}, [loadingMore, hasNext, page, load]);

	const reload = useCallback(() => load(1), [load]);

	const prepend = useCallback((post) => {
		if (!post) return;
		setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
	}, []);

	const removeById = useCallback((id) => {
		setPosts((prev) => prev.filter((p) => p.id !== id));
	}, []);

	return {
		posts,
		status,
		hasNext,
		loadingMore,
		loadMore,
		reload,
		prepend,
		removeById,
	};
}

export default useFeed;
