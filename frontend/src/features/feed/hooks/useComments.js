import { useCallback, useEffect, useState } from "react";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

const PAGE_SIZE = 10;

// Paginated top-level comments for one post (`GET /interaction/comments/post/{id}`).
// Replies are handled inside each CommentItem so this stays flat.
export function useComments(postId) {
	const [comments, setComments] = useState([]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [status, setStatus] = useState("loading"); // loading | ready | error
	const [loadingMore, setLoadingMore] = useState(false);

	const load = useCallback(
		async (targetPage) => {
			const first = targetPage === 1;
			if (first) setStatus("loading");
			else setLoadingMore(true);
			try {
				const result = await api.get(endpoints.interaction.commentsByPost(postId), {
					params: { page: targetPage, size: PAGE_SIZE },
				});
				const content = result?.content ?? [];
				setComments((prev) => {
					if (first) return content;
					const seen = new Set(prev.map((c) => c.id));
					return [...prev, ...content.filter((c) => !seen.has(c.id))];
				});
				setHasNext(Boolean(result?.hasNext));
				setPage(targetPage);
				setStatus("ready");
			} catch {
				if (first) setStatus("error");
			} finally {
				setLoadingMore(false);
			}
		},
		[postId],
	);

	useEffect(() => {
		load(1);
	}, [load]);

	const loadMore = useCallback(() => {
		if (loadingMore || !hasNext) return;
		load(page + 1);
	}, [loadingMore, hasNext, page, load]);

	// New top-level comment goes to the top so the author sees it immediately.
	const addComment = useCallback((comment) => {
		if (!comment) return;
		setComments((prev) => [comment, ...prev]);
	}, []);

	// Gỡ bình luận vừa bị chủ nhân xoá khỏi danh sách đang hiển thị.
	const removeComment = useCallback((commentId) => {
		setComments((prev) => prev.filter((c) => c.id !== commentId));
	}, []);

	return {
		comments,
		status,
		hasNext,
		loadingMore,
		loadMore,
		reload: () => load(1),
		addComment,
		removeComment,
	};
}

export default useComments;
