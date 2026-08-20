import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Modal, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { timeAgo } from "../../../lib/format";

const PAGE_SIZE = 20;

// "Ai đã chia sẻ bài viết này" — song song với LikesModal.
//
// GET /post/shared-posts/{id} trả PageResponse<PostResponse>, một kiểu dữ liệu
// hơi lạ cho danh sách người: mỗi hàng là bài GỐC nhưng đã được gắn tên + avatar
// của người chia sẻ, còn `content` là lời nhắn họ viết kèm (có thể rỗng). Vì các
// hàng dùng chung id bài gốc nên khoá React phải ghép thêm userId.
export default function SharesModal({ open, onClose, postId }) {
	const toast = useToast();
	const [shares, setShares] = useState([]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [loading, setLoading] = useState(false);

	const load = useCallback(
		async (nextPage) => {
			setLoading(true);
			try {
				const res = await api.get(endpoints.post.sharedPosts(postId), {
					params: { page: nextPage, size: PAGE_SIZE },
				});
				const list = res?.content ?? res?.data ?? [];
				setHasNext(Boolean(res?.hasNext));
				setPage(nextPage);
				setShares((prev) => (nextPage === 1 ? list : [...prev, ...list]));
			} catch (err) {
				toast.error(err?.message || "Không tải được danh sách chia sẻ.");
			} finally {
				setLoading(false);
			}
		},
		[postId, toast],
	);

	useEffect(() => {
		if (!open) return;
		setShares([]);
		setPage(1);
		load(1);
	}, [open, load]);

	return (
		<Modal open={open} onClose={onClose} title="Lượt chia sẻ" size="sm">
			<div className="max-h-[60vh] overflow-y-auto">
				{loading && shares.length === 0 ? (
					<div className="space-y-3 py-2">
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-11 w-11 rounded-full" />
								<Skeleton className="h-3.5 w-32" />
							</div>
						))}
					</div>
				) : shares.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted">
						Chưa có ai chia sẻ bài viết này.
					</p>
				) : (
					<div className="divide-y divide-line">
						{shares.map((share, i) => (
							<Link
								key={`${share.userId || "unknown"}-${i}`}
								to={`/profile/${share.userId}`}
								onClick={onClose}
								className="flex items-start gap-3 py-2.5"
							>
								<Avatar src={share.userAvatar} name={share.username} size="md" />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-ink">
										{share.username || "Người dùng"}
									</p>
									{share.content ? (
										<p className="line-clamp-2 text-sm text-muted">{share.content}</p>
									) : null}
									<p className="mt-0.5 text-xs text-faint">
										{timeAgo(share.createdDate || share.created)}
									</p>
								</div>
							</Link>
						))}
					</div>
				)}

				{hasNext && (
					<div className="flex justify-center pt-3">
						<Button
							variant="secondary"
							size="sm"
							loading={loading}
							onClick={() => load(page + 1)}
						>
							Xem thêm
						</Button>
					</div>
				)}
			</div>
		</Modal>
	);
}
