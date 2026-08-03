import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import ProfilePostCard from "./ProfilePostCard";

const PAGE_SIZE = 10;

function PostSkeleton() {
	return (
		<Card className="p-4">
			<div className="flex items-center gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-3.5 w-32" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>
			<div className="mt-4 space-y-2">
				<Skeleton className="h-3.5 w-full" />
				<Skeleton className="h-3.5 w-4/5" />
			</div>
			<Skeleton className="mt-4 h-40 w-full rounded-xl" />
		</Card>
	);
}

// Paginated list of a user's posts. `emptyLabel` differs for self vs others.
export default function PostsTab({ userId, authorName, authorAvatar, isSelf }) {
	const toast = useToast();
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
				const res = await api.get(endpoints.post.byUser(userId), {
					params: { page: nextPage, size: PAGE_SIZE },
				});
				if (id !== reqId.current) return; // a newer request superseded this one
				const content = res?.content ?? [];
				setTotalPages(res?.totalPages ?? 1);
				setPage(nextPage);
				setPosts((prev) => (first ? content : [...prev, ...content]));
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
		[userId, toast],
	);

	useEffect(() => {
		setPosts([]);
		setPage(1);
		load(1);
	}, [load]);

	if (loading) {
		return (
			<div className="space-y-4">
				<PostSkeleton />
				<PostSkeleton />
			</div>
		);
	}

	if (error && posts.length === 0) {
		return (
			<EmptyState
				icon={Note}
				title="Không tải được bài viết"
				description="Đã có lỗi xảy ra khi tải bài viết. Thử lại nhé."
				action={
					<Button variant="outline" size="sm" onClick={() => load(1)}>
						Thử lại
					</Button>
				}
			/>
		);
	}

	if (posts.length === 0) {
		return (
			<EmptyState
				icon={Note}
				title={isSelf ? "Bạn chưa có bài viết nào" : "Chưa có bài viết"}
				description={
					isSelf
						? "Hãy chia sẻ khoảnh khắc đầu tiên của bạn với mọi người."
						: "Người dùng này chưa đăng bài viết nào."
				}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{posts.map((post) => (
				<ProfilePostCard
					key={post.id}
					post={post}
					authorName={authorName}
					authorAvatar={authorAvatar}
				/>
			))}
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
