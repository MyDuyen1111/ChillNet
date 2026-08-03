import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
	BookmarkSimple,
	ChatCircle,
	DotsThreeVertical,
	Globe,
	Heart,
	Lock,
	ShareNetwork,
	Trash,
	UsersThree,
} from "@phosphor-icons/react";
import { Avatar, Button, Card, IconButton, Modal, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { timeAgo } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import PostImageGrid from "./PostImageGrid";
import ImageLightbox from "./ImageLightbox";
import CommentSection from "./CommentSection";

const privacyMeta = {
	PUBLIC: { Icon: Globe, label: "Công khai" },
	FRIENDS: { Icon: UsersThree, label: "Bạn bè" },
	PRIVATE: { Icon: Lock, label: "Chỉ mình tôi" },
};

// A single feed post: author, content, media, and the like / comment / save bar.
// Optimistic toggles roll back on failure. `detail` opens comments by default.
export default function PostCard({ post, onDeleted, detail = false }) {
	const { userId } = useAuth();
	const toast = useToast();

	const [liked, setLiked] = useState(Boolean(post.isLiked));
	const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
	const [saved, setSaved] = useState(Boolean(post.isSaved));
	const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);

	const [showComments, setShowComments] = useState(detail);
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [lightbox, setLightbox] = useState(-1);

	const isOwner = post.isOwnerPost ?? (post.userId != null && post.userId === userId);
	const images = post.imageUrls ?? [];
	const privacy = privacyMeta[post.privacy] || privacyMeta.PUBLIC;

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
			toast.success(next ? "Đã lưu bài viết." : "Đã bỏ lưu.");
		} catch (err) {
			setSaved(!next);
			toast.error(err?.message || "Không thực hiện được, thử lại.");
		}
	};

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

	return (
		<Card className="overflow-hidden">
			{/* Header */}
			<div className="flex items-start gap-3 p-4 pb-3">
				<Link to={`/profile/${post.userId}`} className="shrink-0">
					<Avatar src={post.userAvatar} name={post.username} size="md" />
				</Link>
				<div className="min-w-0 flex-1">
					<Link
						to={`/profile/${post.userId}`}
						className="block truncate font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
					>
						{post.username || "Người dùng"}
					</Link>
					<Link
						to={`/post/${post.id}`}
						className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
					>
						<span className="font-mono">{timeAgo(post.createdDate || post.created)}</span>
						<span aria-hidden="true">·</span>
						<privacy.Icon size={12} />
						<span>{privacy.label}</span>
					</Link>
				</div>

				{isOwner && (
					<div className="relative shrink-0">
						<IconButton
							label="Tuỳ chọn bài viết"
							className="h-9 w-9"
							onClick={() => setMenuOpen((v) => !v)}
						>
							<DotsThreeVertical size={20} weight="bold" />
						</IconButton>
						<AnimatePresence>
							{menuOpen && (
								<>
									<div
										className="fixed inset-0 z-10"
										onClick={() => setMenuOpen(false)}
									/>
									<motion.div
										initial={{ opacity: 0, scale: 0.95, y: -4 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: -4 }}
										transition={{ duration: 0.12 }}
										className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
									>
										<button
											type="button"
											onClick={() => {
												setMenuOpen(false);
												setConfirmOpen(true);
											}}
											className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
										>
											<Trash size={16} />
											Xoá bài viết
										</button>
									</motion.div>
								</>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>

			{/* Content */}
			{post.content && (
				<div className="px-4 pb-3">
					<p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
						{post.content}
					</p>
				</div>
			)}

			{/* Media */}
			{images.length > 0 && (
				<div className="px-4 pb-3">
					<PostImageGrid images={images} onOpen={setLightbox} />
				</div>
			)}

			{/* Stat summary */}
			{(likeCount > 0 || commentCount > 0) && (
				<div className="flex items-center justify-between px-4 pb-2 text-xs text-zinc-500">
					<span className="inline-flex items-center gap-1">
						{likeCount > 0 && (
							<>
								<Heart size={13} weight="fill" className="text-rose-500" />
								<span className="font-mono">{likeCount}</span>
							</>
						)}
					</span>
					{commentCount > 0 && (
						<button
							type="button"
							onClick={() => setShowComments(true)}
							className="hover:underline"
						>
							<span className="font-mono">{commentCount}</span> bình luận
						</button>
					)}
				</div>
			)}

			{/* Action bar */}
			<div className="flex items-center gap-1 border-t border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
				<ActionButton active={liked} activeClass="text-rose-500" onClick={toggleLike}>
					<Heart size={19} weight={liked ? "fill" : "regular"} />
					Thích
				</ActionButton>
				<ActionButton
					active={showComments}
					onClick={() => setShowComments((v) => !v)}
				>
					<ChatCircle size={19} weight={showComments ? "fill" : "regular"} />
					Bình luận
				</ActionButton>
				<ActionButton active={saved} activeClass="text-brand-600 dark:text-brand-400" onClick={toggleSave}>
					<BookmarkSimple size={19} weight={saved ? "fill" : "regular"} />
					Lưu
				</ActionButton>
				{post.shareCount > 0 && (
					<span className="ml-auto inline-flex items-center gap-1 px-2 text-xs text-zinc-400">
						<ShareNetwork size={15} />
						<span className="font-mono">{post.shareCount}</span>
					</span>
				)}
			</div>

			{/* Comments */}
			<AnimatePresence initial={false}>
				{showComments && (
					<CommentSection
						postId={post.id}
						onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
					/>
				)}
			</AnimatePresence>

			{/* Lightbox */}
			<ImageLightbox
				images={images}
				index={lightbox}
				onClose={() => setLightbox(-1)}
				onIndexChange={setLightbox}
			/>

			{/* Delete confirm */}
			<Modal open={confirmOpen} onClose={() => !deleting && setConfirmOpen(false)} title="Xoá bài viết" size="sm">
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					Bạn có chắc muốn xoá bài viết này? Hành động này không thể hoàn tác.
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={deleting}>
						Huỷ
					</Button>
					<Button variant="danger" size="sm" onClick={doDelete} loading={deleting}>
						Xoá
					</Button>
				</div>
			</Modal>
		</Card>
	);
}

// Full-width action-bar item. Kept local so the three buttons stay identical.
function ActionButton({ active, activeClass = "text-brand-600 dark:text-brand-400", onClick, children }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-zinc-600 transition-colors",
				"hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
				active && activeClass,
			)}
		>
			{children}
		</button>
	);
}
