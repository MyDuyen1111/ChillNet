import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
	BookmarkSimple,
	ChatCircle,
	DotsThree,
	Heart,
	PaperPlaneTilt,
	Trash,
} from "@phosphor-icons/react";
import { Avatar, Button, Card, IconButton, Modal, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { timeAgo } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { useComments } from "../hooks/useComments";
import PostImageGrid from "./PostImageGrid";
import ImageLightbox from "./ImageLightbox";
import CommentSection from "./CommentSection";

// Shared like / save / delete state + handlers. `commentCount` lives here too
// (rather than in `useComments`) because the feed card never fetches the
// thread, it only shows a number and a link into the detail page.
function usePostActions(post, onDeleted) {
	const { userId } = useAuth();
	const toast = useToast();

	const [liked, setLiked] = useState(Boolean(post.isLiked));
	const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
	const [saved, setSaved] = useState(Boolean(post.isSaved));
	const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [lightbox, setLightbox] = useState(-1);

	const isOwner = post.isOwnerPost ?? (post.userId != null && post.userId === userId);

	const toggleLike = async () => {
		const next = !liked;
		setLiked(next);
		setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
		try {
			if (next) await api.post(endpoints.interaction.likes, { postId: post.id });
			else await api.delete(endpoints.interaction.unlikePost(post.id));
		} catch (err) {
			setLiked(!next);
			setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
			toast.error(err?.message || "Không thực hiện được, thử lại.");
		}
	};

	const toggleSave = async () => {
		const next = !saved;
		setSaved(next);
		try {
			if (next) await api.post(endpoints.post.save(post.id));
			else await api.delete(endpoints.post.unsave(post.id));
		} catch (err) {
			setSaved(!next);
			toast.error(err?.message || "Không thực hiện được, thử lại.");
		}
	};

	const share = () => toast("Tính năng chia sẻ đang được phát triển.");

	const doDelete = async () => {
		setDeleting(true);
		try {
			await api.delete(endpoints.post.remove(post.id));
			toast.success("Đã xoá bài viết.");
			setConfirmOpen(false);
			onDeleted?.(post.id);
		} catch (err) {
			toast.error(err?.message || "Không xoá được bài viết.");
			setDeleting(false);
		}
	};

	const bumpCommentCount = (delta) => setCommentCount((c) => Math.max(0, c + delta));

	return {
		liked,
		likeCount,
		saved,
		commentCount,
		isOwner,
		menuOpen,
		setMenuOpen,
		confirmOpen,
		setConfirmOpen,
		deleting,
		lightbox,
		setLightbox,
		toggleLike,
		toggleSave,
		share,
		doDelete,
		bumpCommentCount,
	};
}

// Kebab menu, only rendered for the post's owner.
function OwnerMenu({ menuOpen, setMenuOpen, onDeleteClick }) {
	return (
		<div className="relative shrink-0">
			<IconButton label="Tuỳ chọn bài viết" onClick={() => setMenuOpen((v) => !v)}>
				<DotsThree size={20} weight="bold" />
			</IconButton>
			<AnimatePresence>
				{menuOpen && (
					<>
						<div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: -4 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: -4 }}
							transition={{ duration: 0.12 }}
							className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl bg-surface py-1 shadow-[0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-line"
						>
							<button
								type="button"
								onClick={() => {
									setMenuOpen(false);
									onDeleteClick();
								}}
								className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-like transition-opacity hover:opacity-70"
							>
								<Trash size={16} />
								Xoá bài viết
							</button>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}

function DeleteConfirmModal({ open, onClose, onConfirm, loading }) {
	return (
		<Modal open={open} onClose={() => !loading && onClose()} title="Xoá bài viết" size="sm">
			<p className="text-sm text-muted">
				Bạn có chắc muốn xoá bài viết này? Hành động này không thể hoàn tác.
			</p>
			<div className="mt-5 flex justify-end gap-2">
				<Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
					Huỷ
				</Button>
				<Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
					Xoá
				</Button>
			</div>
		</Modal>
	);
}

// Inline "username caption" text, Instagram style: truncates long captions
// behind a "thêm" toggle instead of always showing the full text.
function PostCaption({ userId, username, content }) {
	const [expanded, setExpanded] = useState(false);
	if (!content) return null;

	const LIMIT = 140;
	const isLong = content.length > LIMIT;
	const shown = expanded || !isLong ? content : `${content.slice(0, LIMIT).trimEnd()}...`;

	return (
		<p className="whitespace-pre-wrap break-words text-sm text-ink">
			<Link to={`/profile/${userId}`} className="font-semibold text-ink hover:text-muted">
				{username || "Người dùng"}
			</Link>{" "}
			{shown}
			{isLong && !expanded && (
				<button
					type="button"
					onClick={() => setExpanded(true)}
					className="ml-1 text-muted hover:text-ink"
				>
					thêm
				</button>
			)}
		</p>
	);
}

// Like / comment(slot) / share / save row. `commentSlot` differs between the
// feed card (a link into the detail page) and the detail card (focuses the
// add-comment box that already lives on screen).
function ActionBar({ liked, saved, onToggleLike, onToggleSave, onShare, commentSlot }) {
	return (
		<div className="flex items-center gap-4 px-4 pt-3">
			<button
				type="button"
				onClick={onToggleLike}
				aria-label="Thích"
				className="text-ink transition-opacity hover:opacity-60"
			>
				<Heart size={24} weight={liked ? "fill" : "regular"} className={cn(liked && "text-like")} />
			</button>
			{commentSlot}
			<button
				type="button"
				onClick={onShare}
				aria-label="Chia sẻ"
				className="text-ink transition-opacity hover:opacity-60"
			>
				<PaperPlaneTilt size={24} />
			</button>
			<button
				type="button"
				onClick={onToggleSave}
				aria-label="Lưu"
				className="ml-auto text-ink transition-opacity hover:opacity-60"
			>
				<BookmarkSimple size={24} weight={saved ? "fill" : "regular"} />
			</button>
		</div>
	);
}

// Bare "Thêm bình luận..." row: no border box, "Đăng" only appears once there
// is text to send.
function CommentComposer({ inputRef, value, onChange, onSubmit, sending, autoFocus = false }) {
	return (
		<div className="flex items-center gap-2 px-4 py-3">
			<input
				ref={inputRef}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						onSubmit();
					}
				}}
				placeholder="Thêm bình luận..."
				aria-label="Thêm bình luận"
				autoFocus={autoFocus}
				className="h-6 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
			/>
			{value.trim() && (
				<button
					type="button"
					onClick={onSubmit}
					disabled={sending}
					className="shrink-0 text-sm font-semibold text-accent disabled:opacity-40"
				>
					Đăng
				</button>
			)}
		</div>
	);
}

// Feed-card rendering: header, media carousel, action bar, like count, inline
// caption, "xem tất cả N bình luận" (links to the detail page), quick composer.
function FeedPostCard({ post, onDeleted }) {
	const a = usePostActions(post, onDeleted);
	const toast = useToast();
	const images = post.imageUrls ?? [];

	const [commentText, setCommentText] = useState("");
	const [sending, setSending] = useState(false);

	const submitComment = async () => {
		const value = commentText.trim();
		if (!value || sending) return;
		setSending(true);
		try {
			await api.post(endpoints.interaction.comments, {
				postId: post.id,
				content: value,
				parentCommentId: null,
			});
			setCommentText("");
			a.bumpCommentCount(1);
		} catch (err) {
			toast.error(err?.message || "Không gửi được bình luận.");
		} finally {
			setSending(false);
		}
	};

	return (
		<Card flush>
			<div className="flex items-center gap-3 p-3">
				<Link to={`/profile/${post.userId}`} className="shrink-0">
					<Avatar src={post.userAvatar} name={post.username} size="sm" />
				</Link>
				<div className="flex min-w-0 flex-1 items-center gap-1.5">
					<Link
						to={`/profile/${post.userId}`}
						className="truncate text-sm font-semibold text-ink hover:text-muted"
					>
						{post.username || "Người dùng"}
					</Link>
					<span className="text-xs text-muted" aria-hidden="true">
						·
					</span>
					<Link
						to={`/post/${post.id}`}
						className="shrink-0 text-xs text-muted hover:text-ink"
					>
						{timeAgo(post.createdDate || post.created)}
					</Link>
				</div>
				{a.isOwner && (
					<OwnerMenu
						menuOpen={a.menuOpen}
						setMenuOpen={a.setMenuOpen}
						onDeleteClick={() => a.setConfirmOpen(true)}
					/>
				)}
			</div>

			{images.length > 0 && <PostImageGrid images={images} onOpen={a.setLightbox} />}

			<ActionBar
				liked={a.liked}
				saved={a.saved}
				onToggleLike={a.toggleLike}
				onToggleSave={a.toggleSave}
				onShare={a.share}
				commentSlot={
					<Link
						to={`/post/${post.id}`}
						aria-label="Bình luận"
						className="text-ink transition-opacity hover:opacity-60"
					>
						<ChatCircle size={24} className="-scale-x-100" />
					</Link>
				}
			/>

			{a.likeCount > 0 && (
				<p className="px-4 pt-2 text-sm font-semibold text-ink">{a.likeCount} lượt thích</p>
			)}

			<div className="px-4 pt-1">
				<PostCaption userId={post.userId} username={post.username} content={post.content} />
				{a.commentCount > 0 && (
					<Link
						to={`/post/${post.id}`}
						className="mt-1 block text-sm text-muted hover:text-ink"
					>
						Xem tất cả {a.commentCount} bình luận
					</Link>
				)}
			</div>

			<div className="mt-1 border-t border-line">
				<CommentComposer
					value={commentText}
					onChange={setCommentText}
					onSubmit={submitComment}
					sending={sending}
				/>
			</div>

			<ImageLightbox
				images={images}
				index={a.lightbox}
				onClose={() => a.setLightbox(-1)}
				onIndexChange={a.setLightbox}
			/>

			<DeleteConfirmModal
				open={a.confirmOpen}
				onClose={() => a.setConfirmOpen(false)}
				onConfirm={a.doDelete}
				loading={a.deleting}
			/>
		</Card>
	);
}

// Detail-page rendering: two columns on `md+` (image left, thread right),
// stacked on mobile. Mirrors Instagram's post-detail modal.
function PostDetailCard({ post, onDeleted }) {
	const a = usePostActions(post, onDeleted);
	const toast = useToast();
	const images = post.imageUrls ?? [];
	const composerRef = useRef(null);

	const { comments, status, hasNext, loadingMore, loadMore, addComment } = useComments(post.id);

	const [commentText, setCommentText] = useState("");
	const [sending, setSending] = useState(false);

	const submitComment = async () => {
		const value = commentText.trim();
		if (!value || sending) return;
		setSending(true);
		try {
			const created = await api.post(endpoints.interaction.comments, {
				postId: post.id,
				content: value,
				parentCommentId: null,
			});
			addComment(created);
			a.bumpCommentCount(1);
			setCommentText("");
		} catch (err) {
			toast.error(err?.message || "Không gửi được bình luận.");
		} finally {
			setSending(false);
		}
	};

	return (
		<Card className="mx-auto flex w-full max-w-[935px] flex-col overflow-hidden md:h-[80vh] md:flex-row">
			{images.length > 0 && (
				<div className="aspect-square w-full shrink-0 bg-black md:aspect-auto md:h-full md:flex-1">
					<PostImageGrid images={images} variant="detail" />
				</div>
			)}

			<div className="flex min-h-0 w-full flex-1 flex-col md:w-[405px] md:flex-none md:border-l md:border-line">
				<div className="flex items-center gap-3 border-b border-line p-3">
					<Link to={`/profile/${post.userId}`} className="shrink-0">
						<Avatar src={post.userAvatar} name={post.username} size="sm" />
					</Link>
					<Link
						to={`/profile/${post.userId}`}
						className="min-w-0 flex-1 truncate text-sm font-semibold text-ink hover:text-muted"
					>
						{post.username || "Người dùng"}
					</Link>
					{a.isOwner && (
						<OwnerMenu
							menuOpen={a.menuOpen}
							setMenuOpen={a.setMenuOpen}
							onDeleteClick={() => a.setConfirmOpen(true)}
						/>
					)}
				</div>

				<div className="flex-1 overflow-y-auto px-4 py-4">
					{post.content && (
						<div className="mb-4 flex items-start gap-3">
							<Avatar src={post.userAvatar} name={post.username} size="sm" />
							<PostCaption userId={post.userId} username={post.username} content={post.content} />
						</div>
					)}
					<CommentSection
						comments={comments}
						status={status}
						hasNext={hasNext}
						loadingMore={loadingMore}
						onLoadMore={loadMore}
						postId={post.id}
						onCountChange={a.bumpCommentCount}
					/>
				</div>

				<div className="border-t border-line">
					<ActionBar
						liked={a.liked}
						saved={a.saved}
						onToggleLike={a.toggleLike}
						onToggleSave={a.toggleSave}
						onShare={a.share}
						commentSlot={
							<button
								type="button"
								onClick={() => composerRef.current?.focus()}
								aria-label="Bình luận"
								className="text-ink transition-opacity hover:opacity-60"
							>
								<ChatCircle size={24} className="-scale-x-100" />
							</button>
						}
					/>

					{a.likeCount > 0 && (
						<p className="px-4 pt-2 text-sm font-semibold text-ink">{a.likeCount} lượt thích</p>
					)}
					<p className="px-4 pb-2 pt-1 text-[11px] uppercase tracking-wide text-faint">
						{timeAgo(post.createdDate || post.created)}
					</p>

					<div className="border-t border-line-soft">
						<CommentComposer
							inputRef={composerRef}
							value={commentText}
							onChange={setCommentText}
							onSubmit={submitComment}
							sending={sending}
						/>
					</div>
				</div>
			</div>

			<DeleteConfirmModal
				open={a.confirmOpen}
				onClose={() => a.setConfirmOpen(false)}
				onConfirm={a.doDelete}
				loading={a.deleting}
			/>
		</Card>
	);
}

// A single feed post: author, media, and the like / comment / save bar.
// `detail` switches to the two-column post-detail layout used by
// `PostDetailPage`.
export default function PostCard({ post, onDeleted, detail = false }) {
	return detail ? (
		<PostDetailCard post={post} onDeleted={onDeleted} />
	) : (
		<FeedPostCard post={post} onDeleted={onDeleted} />
	);
}
