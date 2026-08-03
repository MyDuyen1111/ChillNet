import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowClockwise, House } from "@phosphor-icons/react";
import { Button, EmptyState } from "../../components/ui";
import PostComposer from "./components/PostComposer";
import PostCard from "./components/PostCard";
import PostCardSkeleton from "./components/PostCardSkeleton";
import { useFeed } from "./hooks/useFeed";

export default function FeedPage() {
	const { posts, status, hasNext, loadingMore, loadMore, reload, prepend, removeById } = useFeed();
	const reduce = useReducedMotion();
	const sentinelRef = useRef(null);

	// Infinite scroll: pull the next page a bit before the sentinel is on screen.
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: "600px 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [loadMore]);

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-6">
			<PostComposer onCreated={prepend} />

			<div className="mt-4 space-y-4">
				{status === "loading" && (
					<>
						<PostCardSkeleton />
						<PostCardSkeleton withImage={false} />
					</>
				)}

				{status === "error" && (
					<EmptyState
						icon={ArrowClockwise}
						title="Không tải được bảng tin"
						description="Có lỗi khi lấy bài viết. Vui lòng thử lại."
						action={
							<Button variant="secondary" size="sm" onClick={reload}>
								Thử lại
							</Button>
						}
					/>
				)}

				{status === "ready" && posts.length === 0 && (
					<EmptyState
						icon={House}
						title="Bảng tin đang trống"
						description="Chưa có bài viết nào. Hãy đăng bài đầu tiên hoặc kết bạn để xem nhiều hơn."
					/>
				)}

				{status === "ready" && posts.length > 0 && (
					<AnimatePresence initial={false}>
						{posts.map((post) => (
							<motion.div
								key={post.id}
								layout
								initial={reduce ? false : { opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.98 }}
								transition={{ type: "spring", stiffness: 300, damping: 30 }}
							>
								<PostCard post={post} onDeleted={removeById} />
							</motion.div>
						))}
					</AnimatePresence>
				)}

				{/* Infinite-scroll trigger + fallback */}
				<div ref={sentinelRef} className="h-px" />

				{loadingMore && <PostCardSkeleton withImage={false} />}

				{status === "ready" && hasNext && !loadingMore && (
					<Button variant="secondary" onClick={loadMore} className="w-full">
						Tải thêm
					</Button>
				)}

				{status === "ready" && posts.length > 0 && !hasNext && (
					<p className="py-4 text-center text-sm text-zinc-400">
						Bạn đã xem hết bài viết.
					</p>
				)}
			</div>
		</div>
	);
}
