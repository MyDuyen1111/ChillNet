import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "@phosphor-icons/react";
import { Avatar, Button, Modal, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { timeAgo } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import ReportModal from "../../moderation/ReportModal";

// One comment plus, at depth 0, its replies (1 level deep). Replies embedded in
// the response show immediately; the rest load on demand from `/replies`.
// Instagram style: no bubble, inline "username content", a small meta row and
// a tiny heart parked at the far right of the row.
export default function CommentItem({ comment, postId, depth = 0, onCountChange, onDeleted }) {
	const toast = useToast();
	const { userId } = useAuth();

	const [reportOpen, setReportOpen] = useState(false);
	const [liked, setLiked] = useState(Boolean(comment.isLiked));
	const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);

	// Nội dung giữ ở state để bản sửa hiện ngay, không phải tải lại cả luồng.
	const [content, setContent] = useState(comment.content ?? "");
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(comment.content ?? "");
	const [saving, setSaving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const isOwner = comment.userId === userId;

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

	const saveEdit = async () => {
		const text = draft.trim();
		if (!text || saving) return;
		if (text === content) return setEditing(false);
		setSaving(true);
		try {
			const updated = await api.put(endpoints.interaction.commentById(comment.id), {
				content: text,
			});
			setContent(updated?.content ?? text);
			setEditing(false);
		} catch (err) {
			toast.error(err?.message || "Không sửa được bình luận.");
		} finally {
			setSaving(false);
		}
	};

	const remove = async () => {
		setDeleting(true);
		try {
			await api.delete(endpoints.interaction.commentById(comment.id));
			// Backend xoá luôn mọi phản hồi của bình luận này, nên số đếm trên bài
			// phải trừ cả chúng — nếu chỉ trừ 1 thì con số hiển thị sẽ lệch cho đến
			// lần tải lại trang.
			onCountChange?.(-(1 + Math.max(replyCount, replies.length)));
			onDeleted?.(comment.id);
			setConfirmOpen(false);
		} catch (err) {
			toast.error(err?.message || "Không xoá được bình luận.");
			setDeleting(false);
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
				{editing ? (
					<div className="flex items-center gap-2 border-b border-line-soft pb-2">
						<input
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									saveEdit();
								}
								if (e.key === "Escape") {
									setDraft(content);
									setEditing(false);
								}
							}}
							autoFocus
							aria-label="Sửa bình luận"
							className="h-8 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
						/>
						<button
							type="button"
							onClick={saveEdit}
							disabled={saving || !draft.trim()}
							className="shrink-0 text-sm font-semibold text-accent disabled:opacity-40"
						>
							Lưu
						</button>
						<button
							type="button"
							onClick={() => {
								setDraft(content);
								setEditing(false);
							}}
							className="shrink-0 text-sm font-semibold text-muted hover:text-ink"
						>
							Huỷ
						</button>
					</div>
				) : (
					<p className="whitespace-pre-wrap break-words text-sm text-ink">
						<Link
							to={`/profile/${comment.userId}`}
							className="font-semibold text-ink hover:text-muted"
						>
							{comment.username || "Người dùng"}
						</Link>{" "}
						{content}
					</p>
				)}

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
					{isOwner && !editing && (
						<>
							<button
								type="button"
								onClick={() => {
									setDraft(content);
									setEditing(true);
								}}
								className="font-semibold hover:text-ink"
							>
								Sửa
							</button>
							<button
								type="button"
								onClick={() => setConfirmOpen(true)}
								className="font-semibold hover:text-like"
							>
								Xoá
							</button>
						</>
					)}
					{!isOwner && (
						<button
							type="button"
							onClick={() => setReportOpen(true)}
							className="font-semibold hover:text-ink"
						>
							Báo cáo
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
								onDeleted={(id) => {
									setReplies((prev) => prev.filter((r) => r.id !== id));
									setReplyCount((c) => Math.max(0, c - 1));
								}}
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

			<ReportModal
				open={reportOpen}
				onClose={() => setReportOpen(false)}
				targetType="COMMENT"
				targetId={comment.id}
			/>

			<Modal
				open={confirmOpen}
				onClose={() => !deleting && setConfirmOpen(false)}
				title="Xoá bình luận"
				size="sm"
			>
				<p className="text-sm text-muted">
					{replyCount > 0
						? `Bình luận này và ${replyCount} phản hồi của nó sẽ bị xoá vĩnh viễn.`
						: "Bình luận sẽ bị xoá vĩnh viễn."}
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
						Huỷ
					</Button>
					<Button variant="danger" onClick={remove} loading={deleting}>
						Xoá
					</Button>
				</div>
			</Modal>
		</div>
	);
}
