import { ChatCircle } from "@phosphor-icons/react";
import { Button, Skeleton } from "../../../components/ui";
import CommentItem from "./CommentItem";

// The scrollable comment thread for a post's detail view. Purely presentational:
// `PostCard`'s detail branch owns the `useComments` fetch/pagination/addComment
// state (so it can share it with the add-comment box pinned below this list).
export default function CommentSection({
	comments,
	status,
	hasNext,
	loadingMore,
	onLoadMore,
	postId,
	onCountChange,
	onDeleted,
}) {
	return (
		<div className="space-y-4">
			{status === "loading" && (
				<div className="space-y-4">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex gap-3">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3 w-3/4" />
								<Skeleton className="h-2.5 w-20" />
							</div>
						</div>
					))}
				</div>
			)}

			{status === "error" && (
				<p className="py-2 text-center text-sm text-muted">Không tải được bình luận.</p>
			)}

			{status === "ready" && comments.length === 0 && (
				<div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
					<ChatCircle size={28} weight="light" />
					<p className="text-sm">Chưa có bình luận. Hãy là người đầu tiên.</p>
				</div>
			)}

			{status === "ready" && comments.length > 0 && (
				<div className="space-y-4">
					{comments.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							postId={postId}
							onCountChange={onCountChange}
							onDeleted={onDeleted}
						/>
					))}
				</div>
			)}

			{status === "ready" && hasNext && (
				<Button
					variant="link"
					size="sm"
					onClick={onLoadMore}
					loading={loadingMore}
					className="w-full justify-center"
				>
					Xem thêm bình luận
				</Button>
			)}
		</div>
	);
}
