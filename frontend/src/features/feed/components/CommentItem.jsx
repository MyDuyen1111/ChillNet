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
		<div className="flex gap-2.5">
			<Link to={`/profile/${comment.userId}`} className="shrink-0">
				<Avatar src={comment.userAvatar} name={comment.username} size="sm" />
			</Link>
			<div className="min-w-0 flex-1">
				<div className="inline-block max-w-full rounded-2xl bg-zinc-100 px-3.5 py-2 dark:bg-zinc-800">
					<Link
						to={`/profile/${comment.userId}`}
						className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
					>
						{comment.username || "Người dùng"}
					</Link>
					<p className="whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">
						{comment.content}
					</p>
				</div>

				<div className="mt-1 flex items-center gap-3 pl-1 text-xs text-zinc-500">
					<span className="font-mono">{timeAgo(comment.createdAt)}</span>
					<button
						type="button"
						onClick={toggleLike}
						className={cn(
							"inline-flex items-center gap-1 font-medium transition-colors hover:text-zinc-800 dark:hover:text-zinc-200",
							liked && "text-rose-500 hover:text-rose-500",
						)}
					>
						<Heart size={13} weight={liked ? "fill" : "regular"} />
						Thích
						{likeCount > 0 && <span className="font-mono">{likeCount}</span>}
					</button>
					{canReply && (
						<button
							type="button"
							onClick={() => setReplyBoxOpen((v) => !v)}
							className="font-medium transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
						>
							Trả lời
						</button>
					)}
				</div>

				{replyBoxOpen && (
					<div className="mt-2 flex items-center gap-2">
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
							className="h-9 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
						/>
						<button
							type="button"
							onClick={sendReply}
							disabled={!replyText.trim() || sendingReply}
							className="shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
						>
							Gửi
						</button>
					</div>
				)}

				{canReply && hiddenReplies > 0 && (
					<button
						type="button"
						onClick={openReplies}
						disabled={loadingReplies}
						className="mt-2 pl-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
					>
						{loadingReplies ? "Đang tải..." : `Xem ${hiddenReplies} phản hồi`}
					</button>
				)}

				{canReply && repliesOpen && replies.length > 0 && (
					<div className="mt-3 space-y-3 border-l border-zinc-200 pl-3 dark:border-zinc-800">
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
		</div>
	);
}
