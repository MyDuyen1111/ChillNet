import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "@phosphor-icons/react";
import { Avatar, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { timeAgo } from "../../../lib/format";
import { cn } from "../../../lib/cn";

// One comment plus, at depth 0, its replies (1 level deep). Replies embedded in
// the response show immediately; the rest load on demand from `/replies`.
// Instagram style: no bubble, inline "username content", a small meta row and
// a tiny heart parked at the far right of the row.
export default function CommentItem({ comment, postId, depth = 0, onCountChange }) {
	const toast = useToast();

	const [liked, setLiked] = useState(Boolean(comment.isLiked));
	const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);

	const [replies, setReplies] = useState(comment.replies ?? []);
	const [replyCount, setReplyCount] = useState(comment.replyCount ?? comment.replies?.length ?? 0);
	const [repliesOpen, setRepliesOpen] = useState(false);
	const [loadingReplies, setLoadingReplies] = useState(false);

	const [replyBoxOpen, setReplyBoxOpen] = useState(false);
	const [replyText, setReplyText] = useState("");
	const [sendingReply, setSendingReply] = useState(false);

	const canReply = depth === 0;
	const hiddenReplies = repliesOpen ? 0 : Math.max(replyCount, replies.length);

	const toggleLike = async () => {
		const next = !liked;
		setLiked(next);
		setLikeCount((c) => c + (next ? 1 : -1));
		try {
			if (next) await api.post(endpoints.interaction.likes, { commentId: comment.id });
			else await api.delete(endpoints.interaction.unlikeComment(comment.id));
		} catch (err) {
			setLiked(!next);
			setLikeCount((c) => c + (next ? -1 : 1));
			toast.error(err?.message || "Không thực hiện được, thử lại.");
		}
	};

	const openReplies = async () => {
		setRepliesOpen(true);
		// Already have them embedded? Just reveal.
		if (replies.length >= replyCount && replies.length > 0) return;
		setLoadingReplies(true);
		try {
			const result = await api.get(endpoints.interaction.replies(comment.id), {
				params: { page: 1, size: 20 },
			});
			setReplies(result?.content ?? []);
		} catch (err) {
			setRepliesOpen(false);
			toast.error(err?.message || "Không tải được phản hồi.");
		} finally {
			setLoadingReplies(false);
		}
	};

	const sendReply = async () => {
		const text = replyText.trim();
		if (!text || sendingReply) return;
		setSendingReply(true);
		try {
			const created = await api.post(endpoints.interaction.comments, {
				postId,
				content: text,
				parentCommentId: comment.id,
			});
			setReplies((prev) => [...prev, created]);
			setReplyCount((c) => c + 1);
			setRepliesOpen(true);
			setReplyText("");
			setReplyBoxOpen(false);
			onCountChange?.(1);
		} catch (err) {
			toast.error(err?.message || "Không gửi được phản hồi.");
		} finally {
			setSendingReply(false);
		}
	};

	return (
		<div className="flex items-start gap-3">
			<Link to={`/profile/${comment.userId}`} className="shrink-0">
				<Avatar src={comment.userAvatar} name={comment.username} size="sm" />
			</Link>

			<div className="min-w-0 flex-1">
				<p className="whitespace-pre-wrap break-words text-sm text-ink">
					<Link
						to={`/profile/${comment.userId}`}
						className="font-semibold text-ink hover:text-muted"
					>
						{comment.username || "Người dùng"}
					</Link>{" "}
					{comment.content}
				</p>

				<div className="mt-1 flex items-center gap-3 text-xs text-muted">
					<span>{timeAgo(comment.createdAt)}</span>
					{likeCount > 0 && <span>{likeCount} lượt thích</span>}
					{canReply && (
						<button
							type="button"
							onClick={() => setReplyBoxOpen((v) => !v)}
							className="font-semibold hover:text-ink"
						>
							Trả lời
						</button>
					)}
				</div>

				{replyBoxOpen && (
					<div className="mt-2 flex items-center gap-2 border-b border-line-soft pb-2">
						<input
							value={replyText}
							onChange={(e) => setReplyText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									sendReply();
								}
							}}
							placeholder="Viết phản hồi..."
							className="h-8 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
						/>
						{replyText.trim() && (
							<button
								type="button"
								onClick={sendReply}
								disabled={sendingReply}
								className="shrink-0 text-sm font-semibold text-accent disabled:opacity-40"
							>
								Đăng
							</button>
						)}
					</div>
				)}

				{canReply && hiddenReplies > 0 && (
					<button
						type="button"
						onClick={openReplies}
						disabled={loadingReplies}
						className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"
					>
						<span className="h-px w-6 bg-line" />
						{loadingReplies ? "Đang tải..." : `Xem ${hiddenReplies} phản hồi`}
					</button>
				)}

				{canReply && repliesOpen && replies.length > 0 && (
					<div className="mt-3 space-y-3 pl-11">
						{replies.map((reply) => (
							<CommentItem
								key={reply.id}
								comment={reply}
								postId={postId}
								depth={depth + 1}
								onCountChange={onCountChange}
							/>
						))}
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={toggleLike}
				aria-label="Thích bình luận"
				className="mt-1 shrink-0 text-muted transition-opacity hover:opacity-60"
			>
				<Heart size={12} weight={liked ? "fill" : "regular"} className={cn(liked && "text-like")} />
			</button>
		</div>
	);
}
