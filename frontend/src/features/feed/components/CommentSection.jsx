import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChatCircle, PaperPlaneRight } from "@phosphor-icons/react";
import { Avatar, Button, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";
import { useComments } from "../hooks/useComments";
import CommentItem from "./CommentItem";

// The comment area under a post: composer row + paginated thread. `onCountChange`
// bubbles up so the card's comment counter stays in sync with new comments.
export default function CommentSection({ postId, onCountChange }) {
	const { user } = useAuth();
	const toast = useToast();
	const reduce = useReducedMotion();
	const { comments, status, hasNext, loadingMore, loadMore, addComment } = useComments(postId);

	const [text, setText] = useState("");
	const [sending, setSending] = useState(false);

	const profile = user?.profile;
	const avatar = profile?.avatar || profile?.avatarUrl || profile?.imageUrl;

	const submit = async () => {
		const value = text.trim();
		if (!value || sending) return;
		setSending(true);
		try {
			const created = await api.post(endpoints.interaction.comments, {
				postId,
				content: value,
				parentCommentId: null,
			});
			addComment(created);
			onCountChange?.(1);
			setText("");
		} catch (err) {
			toast.error(err?.message || "Không gửi được bình luận.");
		} finally {
			setSending(false);
		}
	};

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			exit={{ opacity: 0, height: 0 }}
			className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
		>
			<div className="space-y-4 px-4 py-4">
				{/* Composer */}
				<div className="flex items-center gap-2.5">
					<Avatar src={avatar} name={displayName(profile)} size="sm" />
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								submit();
							}
						}}
						placeholder="Viết bình luận..."
						aria-label="Viết bình luận"
						className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
					/>
					<button
						type="button"
						onClick={submit}
						disabled={!text.trim() || sending}
						aria-label="Gửi bình luận"
						className="shrink-0 rounded-xl bg-brand-600 p-2.5 text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
					>
						<PaperPlaneRight size={16} weight="fill" />
					</button>
				</div>

				{/* Thread */}
				{status === "loading" && (
					<div className="space-y-3">
						{[0, 1].map((i) => (
							<div key={i} className="flex gap-2.5">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-12 w-3/4 rounded-2xl" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
						))}
					</div>
				)}

				{status === "error" && (
					<p className="py-2 text-center text-sm text-zinc-500">
						Không tải được bình luận.
					</p>
				)}

				{status === "ready" && comments.length === 0 && (
					<div className="flex flex-col items-center gap-1 py-4 text-center text-zinc-500">
						<ChatCircle size={24} />
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
							/>
						))}
					</div>
				)}

				{status === "ready" && hasNext && (
					<Button
						variant="ghost"
						size="sm"
						onClick={loadMore}
						loading={loadingMore}
						className="w-full"
					>
						Xem thêm bình luận
					</Button>
				)}
			</div>
		</motion.div>
	);
}
