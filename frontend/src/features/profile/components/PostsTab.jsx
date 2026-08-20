import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "@phosphor-icons/react";
import { Button, EmptyState, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import ProfilePostCard from "./ProfilePostCard";

const PAGE_SIZE = 12;

function GridSkeleton() {
	return (
		<div className="grid grid-cols-3 gap-1">
			{Array.from({ length: 9 }).map((_, i) => (
				<Skeleton key={i} className="aspect-square rounded-none" />
			))}
		</div>
	);
}

// Lưới bài viết có phân trang. Mặc định là bài của một người
// (GET /post/user/{id}), nhưng tab "Đã lưu" dùng lại đúng lưới này với
// GET /post/saved-posts — hai endpoint trả cùng PageResponse<PostResponse> nên
// chỉ cần đổi URL, không cần một component thứ hai.
//
// `onCountChange` reports the total post count up to ProfileHeader so it can
// show it in the "bài viết" stat, without a second fetch.
export default function PostsTab({ userId, isSelf, onCountChange, url, empty }) {
	const toast = useToast();
	const source = url || endpoints.post.byUser(userId);
	const [posts, setPosts] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState(false);
	const reqId = useRef(0);

	const load = useCallback(
		async (nextPage) => {
			const id = ++reqId.current;
			const first = nextPage === 1;
			first ? setLoading(true) : setLoadingMore(true);
			setError(false);
			try {
				const res = await api.get(source, {
					params: { page: nextPage, size: PAGE_SIZE },
				});
				if (id !== reqId.current) return; // a newer request superseded this one
				const content = res?.content ?? [];
				setTotalPages(res?.totalPages ?? 1);
				setPage(nextPage);
				setPosts((prev) => (first ? content : [...prev, ...content]));
				if (first) onCountChange?.(res?.totalElements ?? content.length);
			} catch (err) {
				if (id !== reqId.current) return;
				setError(true);
				if (!first) toast.error(err.message || "Không tải được bài viết.");
			} finally {
				if (id === reqId.current) {
					setLoading(false);
					setLoadingMore(false);
				}
			}
		},
		[source, toast, onCountChange],
	);

	useEffect(() => {
		setPosts([]);
		setPage(1);
		load(1);
	}, [load]);

	if (loading) {
		return <GridSkeleton />;
	}

	if (error && posts.length === 0) {
		return (
			<EmptyState
				icon={empty?.icon || Camera}
				title="Không tải được bài viết"
				description="Đã có lỗi xảy ra khi tải bài viết. Thử lại nhé."
				action={
					<Button variant="secondary" size="sm" onClick={() => load(1)}>
						Thử lại
					</Button>
				}
			/>
		);
	}

	if (posts.length === 0) {
		return (
			<EmptyState
				icon={empty?.icon || Camera}
				title={empty?.title || "Chia sẻ ảnh"}
				description={
					empty?.description ||
					(isSelf
						? "Khi bạn chia sẻ ảnh, chúng sẽ xuất hiện ở đây trên trang cá nhân của bạn."
						: "Người dùng này chưa đăng bài viết nào.")
				}
			/>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-3 gap-1">
				{posts.map((post) => (
					<ProfilePostCard key={post.id} post={post} />
				))}
			</div>
			{page < totalPages && (
				<div className="flex justify-center pt-1">
					<Button
						variant="secondary"
						size="sm"
						loading={loadingMore}
						onClick={() => load(page + 1)}
					>
						Xem thêm bài viết
					</Button>
				</div>
			)}
		</div>
	);
}
