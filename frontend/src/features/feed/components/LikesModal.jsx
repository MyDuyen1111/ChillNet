import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Modal, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

const PAGE_SIZE = 20;

// "Ai đã thích bài viết này". LikeResponse đã kèm sẵn username + avatar nên
// không phải lấy thêm hồ sơ như các danh sách bên social-service.
export default function LikesModal({ open, onClose, postId }) {
	const toast = useToast();
	const [likes, setLikes] = useState([]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [loading, setLoading] = useState(false);

	const load = useCallback(
		async (nextPage) => {
			setLoading(true);
			try {
				const res = await api.get(endpoints.interaction.likesByPost(postId), {
					params: { page: nextPage, size: PAGE_SIZE },
				});
				const list = res?.content ?? res?.data ?? [];
				setHasNext(Boolean(res?.hasNext));
				setPage(nextPage);
				setLikes((prev) => (nextPage === 1 ? list : [...prev, ...list]));
			} catch (err) {
				toast.error(err?.message || "Không tải được danh sách lượt thích.");
			} finally {
				setLoading(false);
			}
		},
		[postId, toast],
	);

	useEffect(() => {
		if (!open) return;
		setLikes([]);
		setPage(1);
		load(1);
	}, [open, load]);

	return (
		<Modal open={open} onClose={onClose} title="Lượt thích" size="sm">
			<div className="max-h-[60vh] overflow-y-auto">
				{loading && likes.length === 0 ? (
					<div className="space-y-3 py-2">
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-11 w-11 rounded-full" />
								<Skeleton className="h-3.5 w-32" />
							</div>
						))}
					</div>
				) : likes.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted">Chưa có ai thích bài viết này.</p>
				) : (
					<div className="divide-y divide-line">
						{likes.map((like) => (
							<Link
								key={like.id}
								to={`/profile/${like.userId}`}
								onClick={onClose}
								className="flex items-center gap-3 py-2.5"
							>
								<Avatar src={like.userAvatar} name={like.username} size="md" />
								<span className="min-w-0 truncate text-sm font-semibold text-ink">
									{like.username || "Người dùng"}
								</span>
							</Link>
						))}
					</div>
				)}

				{hasNext && (
					<div className="flex justify-center pt-3">
						<Button variant="secondary" size="sm" loading={loading} onClick={() => load(page + 1)}>
							Xem thêm
						</Button>
					</div>
				)}
			</div>
		</Modal>
	);
}
