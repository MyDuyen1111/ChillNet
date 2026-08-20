import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
	ArrowsClockwise,
	BookmarkSimple,
	ChatCircle,
	DotsThree,
	Flag,
	Heart,
	Lock,
	PaperPlaneTilt,
	PencilSimple,
	Plus,
	Smiley,
	Trash,
	X,
} from "@phosphor-icons/react";
import {
	Avatar,
	Button,
	Card,
	IconButton,
	Modal,
	Textarea,
	useToast,
} from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { postDate, timeAgo } from "../../../lib/format";
import { cn } from "../../../lib/cn";
import { screenImageFiles, uploadPostImages } from "../../../lib/uploads";
import { useComments } from "../hooks/useComments";
import ReportModal from "../../moderation/ReportModal";
import LikesModal from "./LikesModal";
import SharePostModal from "./SharePostModal";
import SharesModal from "./SharesModal";
import PostImageGrid from "./PostImageGrid";
import PostLink from "./PostLink";
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
	const [shareCount, setShareCount] = useState(Number(post.shareCount ?? 0));
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [reposting, setReposting] = useState(false);
	const [lightbox, setLightbox] = useState(-1);
	// Nội dung giữ ở state để bản vừa sửa hiện ngay trên chính thẻ này.
	const [content, setContent] = useState(post.content ?? "");
	const [privacy, setPrivacy] = useState(post.privacy ?? "PUBLIC");
	const [images, setImages] = useState(post.imageUrls ?? []);
	const [editOpen, setEditOpen] = useState(false);
	const [savingEdit, setSavingEdit] = useState(false);
	const [likesOpen, setLikesOpen] = useState(false);
	const [shareOpen, setShareOpen] = useState(false);
	const [sharesOpen, setSharesOpen] = useState(false);

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

	// Máy bay giấy của Instagram là "gửi qua tin nhắn" — ChillNet chưa nối chat vào
	// bài viết, nên ở đây làm việc gần nhất mà vẫn có ích thật: sao chép liên kết.
	const share = async () => {
		const url = `${window.location.origin}/post/${post.id}`;
		try {
			await navigator.clipboard.writeText(url);
			toast.success("Đã sao chép liên kết bài viết.");
		} catch {
			// clipboard API cần HTTPS hoặc localhost; ngoài phạm vi đó thì báo để
			// người dùng tự copy thay vì im lặng không có gì xảy ra.
			toast.error(`Không sao chép được. Liên kết: ${url}`);
		}
	};

	// `content` phải đi bằng query param: backend khai báo @RequestParam chứ không
	// phải @RequestBody, gửi trong body thì lời nhắn rơi mất và bài chia sẻ trống.
	const doRepost = async (message) => {
		if (reposting) return;
		setReposting(true);
		try {
			await api.post(endpoints.post.share(post.id), null, {
				params: message ? { content: message } : undefined,
			});
			setShareCount((c) => c + 1);
			setShareOpen(false);
			toast.success("Đã chia sẻ bài viết.");
		} catch (err) {
			toast.error(err?.message || "Không chia sẻ được, thử lại.");
		} finally {
			setReposting(false);
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

	// Sửa luôn đi qua endpoint JSON, kể cả khi có ảnh mới.
	//
	// `PUT /post/{id}` (multipart) thay TOÀN BỘ imageUrls bằng đúng những file vừa
	// gửi, nên thêm một ảnh sẽ xoá sạch ảnh cũ. Đường JSON nhận sẵn `imageUrls`,
	// nên ta tự upload ảnh mới lên file-service rồi gửi danh sách đầy đủ
	// (ảnh giữ lại + ảnh mới) — cách duy nhất vừa thêm vừa giữ được ảnh cũ.
	//
	// Một giới hạn không lách được: backend bỏ qua `imageUrls` rỗng, nên không có
	// cách nào xoá hết ảnh của một bài đã có ảnh. EditPostModal chặn trước ở UI.
	const saveEdit = async (nextContent, nextPrivacy, keptUrls, newFiles) => {
		const text = (nextContent ?? "").trim();
		const kept = keptUrls ?? images;
		const files = newFiles ?? [];
		if (savingEdit) return;
		if (!text && kept.length === 0 && files.length === 0) return;

		setSavingEdit(true);
		try {
			const imagesChanged = files.length > 0 || kept.length !== images.length;
			let nextImages;
			if (imagesChanged) {
				const uploaded = await uploadPostImages(files, {
					ownerId: userId,
					postId: post.id,
				});
				nextImages = [...kept, ...uploaded];
			}

			const updated = await api.put(endpoints.post.updateJson(post.id), {
				content: text,
				privacy: nextPrivacy,
				...(nextImages ? { imageUrls: nextImages } : {}),
			});
			setContent(updated?.content ?? text);
			setPrivacy(updated?.privacy ?? nextPrivacy);
			setImages(updated?.imageUrls ?? nextImages ?? images);
			setEditOpen(false);
			toast.success("Đã cập nhật bài viết.");
		} catch (err) {
			toast.error(err?.message || "Không cập nhật được bài viết.");
		} finally {
			setSavingEdit(false);
		}
	};

	const bumpCommentCount = (delta) => setCommentCount((c) => Math.max(0, c + delta));

	return {
		liked,
		likeCount,
		saved,
		commentCount,
		shareCount,
		isOwner,
		menuOpen,
		setMenuOpen,
		confirmOpen,
		setConfirmOpen,
		reportOpen,
		setReportOpen,
		deleting,
		lightbox,
		setLightbox,
		toggleLike,
		toggleSave,
		share,
		doRepost,
		reposting,
		doDelete,
		bumpCommentCount,
		content,
		privacy,
		images,
		likesOpen,
		setLikesOpen,
		shareOpen,
		setShareOpen,
		sharesOpen,
		setSharesOpen,
		editOpen,
		setEditOpen,
		savingEdit,
		saveEdit,
	};
}

// Kebab menu. Chủ bài viết thấy "Xoá"; người khác thấy "Báo cáo" — nên menu này
// giờ luôn được render, không còn phụ thuộc vào isOwner như trước.
function PostMenu({ menuOpen, setMenuOpen, isOwner, onEditClick, onDeleteClick, onReportClick }) {
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
							{isOwner ? (
								<>
								<button
									type="button"
									onClick={() => {
										setMenuOpen(false);
										onEditClick();
									}}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-hover"
								>
									<PencilSimple size={16} />
									Chỉnh sửa
								</button>
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
								</>
							) : (
								<button
									type="button"
									onClick={() => {
										setMenuOpen(false);
										onReportClick();
									}}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-like transition-opacity hover:opacity-70"
								>
									<Flag size={16} />
									Báo cáo
								</button>
							)}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}

// Giữ bằng số ảnh tối đa của trình soạn bài để một bài đã sửa không thể vượt quá
// giới hạn mà chính trình soạn bài áp lúc đăng.
const MAX_IMAGES = 4;

// Sửa bài viết: chú thích, quyền riêng tư và cả ảnh.
//
// Ảnh cũ được liệt kê để gỡ từng cái, ảnh mới chọn từ máy. Lúc lưu, PostCard
// upload ảnh mới lên file-service rồi gửi danh sách URL đầy đủ qua endpoint JSON
// (xem `saveEdit`). Ràng buộc duy nhất: bài đang có ảnh thì phải còn ít nhất một
// ảnh — backend bỏ qua `imageUrls` rỗng nên "xoá hết ảnh" là việc không gửi được.
function EditPostModal({
	open,
	onClose,
	initialContent,
	initialPrivacy,
	initialImages,
	onSave,
	loading,
}) {
	const toast = useToast();
	const fileRef = useRef(null);
	const liveRef = useRef([]);
	const [draft, setDraft] = useState(initialContent ?? "");
	const [privacy, setPrivacy] = useState(initialPrivacy ?? "PUBLIC");
	const [kept, setKept] = useState(initialImages ?? []);
	const [added, setAdded] = useState([]); // { file, url }

	const revokeAll = (list) => list.forEach((a) => URL.revokeObjectURL(a.url));

	// Mở lại modal sau khi đã sửa thì phải bắt đầu từ nội dung mới nhất.
	useEffect(() => {
		if (!open) return;
		setDraft(initialContent ?? "");
		setPrivacy(initialPrivacy ?? "PUBLIC");
		setKept(initialImages ?? []);
		setAdded((prev) => {
			revokeAll(prev);
			return [];
		});
	}, [open, initialContent, initialPrivacy, initialImages]);

	// Thu hồi object URL còn sót khi component biến mất.
	useEffect(() => {
		liveRef.current = added;
	}, [added]);
	useEffect(() => () => revokeAll(liveRef.current), []);

	const total = kept.length + added.length;
	const hadImages = (initialImages ?? []).length > 0;
	const wouldEmptyImages = hadImages && total === 0;

	const pickFiles = (e) => {
		// Sao chép ra mảng TRƯỚC khi reset value — gán value = "" xoá luôn
		// input.files, mà e.target.files chỉ là tham chiếu tới nó.
		const list = Array.from(e.target.files || []);
		e.target.value = "";

		const { ok, rejected } = screenImageFiles(list);
		if (rejected.length > 0) toast.error(rejected.join("; "));

		const room = Math.max(0, MAX_IMAGES - total);
		if (ok.length > room) toast(`Bài viết chỉ được tối đa ${MAX_IMAGES} ảnh.`);

		const chosen = ok.slice(0, room);
		if (chosen.length === 0) return;
		setAdded((prev) => [
			...prev,
			...chosen.map((file) => ({ file, url: URL.createObjectURL(file) })),
		]);
	};

	const removeAdded = (idx) => {
		setAdded((prev) => {
			URL.revokeObjectURL(prev[idx]?.url);
			return prev.filter((_, i) => i !== idx);
		});
	};

	const imagesChanged = added.length > 0 || kept.length !== (initialImages ?? []).length;
	const unchanged =
		draft === (initialContent ?? "") && privacy === initialPrivacy && !imagesChanged;

	return (
		<Modal open={open} onClose={() => !loading && onClose()} title="Chỉnh sửa bài viết" size="md">
			<input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />

			<Textarea
				rows={6}
				maxLength={5000}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				placeholder="Bạn đang nghĩ gì?"
				aria-label="Nội dung bài viết"
			/>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				{kept.map((url, i) => (
					<div key={url} className="relative">
						<img
							src={url}
							alt={`Ảnh ${i + 1}`}
							className="h-16 w-16 rounded border border-line object-cover"
						/>
						<button
							type="button"
							onClick={() => setKept((prev) => prev.filter((u) => u !== url))}
							disabled={loading}
							aria-label={`Gỡ ảnh ${i + 1}`}
							className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white transition-opacity hover:opacity-70 disabled:opacity-40"
						>
							<X size={10} />
						</button>
					</div>
				))}
				{added.map((a, i) => (
					<div key={a.url} className="relative">
						<img
							src={a.url}
							alt={`Ảnh mới ${i + 1}`}
							className="h-16 w-16 rounded border border-accent object-cover"
						/>
						<button
							type="button"
							onClick={() => removeAdded(i)}
							disabled={loading}
							aria-label={`Gỡ ảnh mới ${i + 1}`}
							className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white transition-opacity hover:opacity-70 disabled:opacity-40"
						>
							<X size={10} />
						</button>
					</div>
				))}
				{total < MAX_IMAGES && (
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={loading}
						aria-label="Thêm ảnh"
						className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-line text-faint transition-colors hover:text-muted disabled:opacity-40"
					>
						<Plus size={18} />
					</button>
				)}
			</div>

			{wouldEmptyImages && (
				<p className="mt-2 text-xs text-like">
					Bài viết phải còn ít nhất một ảnh. Muốn bỏ hết ảnh thì phải xoá bài rồi đăng lại.
				</p>
			)}

			<label className="mt-4 flex items-center gap-2 text-sm text-muted">
				Quyền riêng tư
				<select
					value={privacy}
					onChange={(e) => setPrivacy(e.target.value)}
					className="rounded border border-line bg-canvas px-2 py-1 text-sm text-ink focus:border-muted"
				>
					<option value="PUBLIC">Công khai</option>
					<option value="PRIVATE">Riêng tư</option>
				</select>
			</label>
			<div className="mt-4 flex justify-end gap-2">
				<Button variant="ghost" onClick={onClose} disabled={loading}>
					Huỷ
				</Button>
				<Button
					onClick={() => onSave(draft, privacy, kept, added.map((a) => a.file))}
					loading={loading}
					disabled={
						unchanged || wouldEmptyImages || (!draft.trim() && total === 0)
					}
				>
					Lưu thay đổi
				</Button>
			</div>
		</Modal>
	);
}

// post-service trả originalPostUserId/Username/Avatar cho bài được đăng lại,
// nhưng giao diện chưa từng đọc tới, nên một bài chia sẻ trông y hệt bài gốc và
// tác giả thật bị mất tên.
function SharedFrom({ post }) {
	if (!post.originalPostUserId) return null;
	return (
		<span className="flex items-center gap-1 text-xs text-muted">
			<ArrowsClockwise size={12} />
			Đã chia sẻ bài viết của{" "}
			<Link
				to={`/profile/${post.originalPostUserId}`}
				className="font-semibold text-ink hover:text-muted"
			>
				{post.originalPostUsername || "một người dùng"}
			</Link>
		</span>
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
// Instagram kẹp tỉ lệ ảnh trong khoảng 4:5 (dọc) đến 1.91:1 (ngang) ngay lúc
// đăng, rồi cho khung ảnh ăn theo đúng tỉ lệ đó — nên popup của họ không có dải
// đen. Ta không crop lúc upload, nên làm bước tương đương ở đây: đo tỉ lệ ảnh
// thật rồi kẹp lại, khung ảnh sẽ bám theo thay vì cố định 86vh.
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

function useImageRatio(url) {
	const [ratio, setRatio] = useState(1);
	useEffect(() => {
		if (!url) return undefined;
		let alive = true;
		const probe = new Image();
		probe.onload = () => {
			if (!alive || !probe.naturalHeight) return;
			const natural = probe.naturalWidth / probe.naturalHeight;
			setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, natural)));
		};
		probe.src = url;
		return () => {
			alive = false;
		};
	}, [url]);
	return ratio;
}

// `clamp` = cắt bớt nội dung dài (dùng ở feed). Trang chi tiết truyền false để
// hiện đầy đủ, giống Instagram.
function PostCaption({ userId, username, content, clamp = true }) {
	const [expanded, setExpanded] = useState(false);
	if (!content) return null;

	const LIMIT = 140;
	const isLong = clamp && content.length > LIMIT;
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
// Số đếm nằm ngay cạnh icon (không phải dòng "N lượt thích" bên dưới). Số 0 thì
// ẩn hẳn cho đỡ rối — hàng nút chỉ hiện con số khi thực sự có tương tác.
function ActionCount({ value }) {
	if (!value) return null;
	return <span className="text-sm font-semibold">{value}</span>;
}

function ActionBar({
	liked,
	saved,
	likeCount,
	shareCount,
	onToggleLike,
	onToggleSave,
	onShare,
	onRepost,
	onShowLikes,
	onShowShares,
	reposting,
	commentSlot,
}) {
	return (
		<div className="flex items-center gap-4 px-4 pt-3">
			<button
				type="button"
				onClick={onToggleLike}
				aria-label="Thích"
				className={cn(
					"flex items-center gap-1.5 transition-opacity hover:opacity-60",
					liked ? "text-like" : "text-ink",
				)}
			>
				<Heart size={24} weight={liked ? "fill" : "regular"} />
			</button>
			{/* Con số tách khỏi nút tim: bấm vào số là xem AI đã thích
			    (GET /likes/post/{id}), bấm vào tim mới là thích/bỏ thích. */}
			{likeCount > 0 && (
				<button
					type="button"
					onClick={onShowLikes}
					className="-ml-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-60"
				>
					{likeCount}
				</button>
			)}
			{commentSlot}
			<button
				type="button"
				onClick={onRepost}
				disabled={reposting}
				aria-label="Chia sẻ bài viết"
				className="flex items-center gap-1.5 text-ink transition-opacity hover:opacity-60 disabled:opacity-40"
			>
				<ArrowsClockwise size={24} />
			</button>
			{/* Cùng cách chia như lượt thích: icon để chia sẻ, con số để xem ai đã
			    chia sẻ (GET /post/shared-posts/{id}). */}
			{shareCount > 0 && (
				<button
					type="button"
					onClick={onShowShares}
					className="-ml-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-60"
				>
					{shareCount}
				</button>
			)}
			<button
				type="button"
				onClick={onShare}
				aria-label="Sao chép liên kết"
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
// Bộ emoji hay dùng, đúng danh sách Instagram gợi ý sẵn dưới ô bình luận.
const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"];

function CommentComposer({ inputRef, value, onChange, onSubmit, sending, autoFocus = false }) {
	const [pickerOpen, setPickerOpen] = useState(false);

	return (
		<div className="relative flex items-center gap-2 px-4 py-3">
			{pickerOpen && (
				<>
					{/* Lớp phủ trong suốt: bấm ra ngoài là đóng bảng emoji. */}
					<button
						type="button"
						aria-label="Đóng bảng biểu tượng cảm xúc"
						className="fixed inset-0 z-10 cursor-default"
						onClick={() => setPickerOpen(false)}
					/>
					<div className="absolute bottom-full left-3 z-20 mb-1 flex gap-1 rounded-lg border border-line bg-surface p-2 shadow-lg">
						{QUICK_EMOJIS.map((emoji) => (
							<button
								key={emoji}
								type="button"
								className="rounded p-1 text-lg leading-none transition-colors hover:bg-hover"
								onClick={() => {
									onChange(value + emoji);
									setPickerOpen(false);
									inputRef?.current?.focus();
								}}
							>
								{emoji}
							</button>
						))}
					</div>
				</>
			)}

			<button
				type="button"
				onClick={() => setPickerOpen((o) => !o)}
				aria-label="Chèn biểu tượng cảm xúc"
				aria-expanded={pickerOpen}
				className="shrink-0 text-ink transition-opacity hover:opacity-60"
			>
				<Smiley size={24} />
			</button>
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
			{/* Instagram luôn hiện nút "Đăng", chỉ làm mờ khi chưa có gì để gửi. */}
			<button
				type="button"
				onClick={onSubmit}
				disabled={sending || !value.trim()}
				className="shrink-0 text-sm font-semibold text-accent disabled:opacity-40"
			>
				Đăng
			</button>
		</div>
	);
}

// Feed-card rendering: header, media carousel, action bar, like count, inline
// caption, "xem tất cả N bình luận" (links to the detail page), quick composer.
function FeedPostCard({ post, onDeleted }) {
	const a = usePostActions(post, onDeleted);
	const toast = useToast();
	// Lấy từ state của usePostActions, không phải từ prop: sửa bài xong danh sách
	// ảnh phải đổi ngay trên chính thẻ này mà không cần tải lại feed.
	const images = a.images;
	const hasImages = images.length > 0;
	// Bám tỉ lệ ảnh thật (đã kẹp 4:5..1.91:1) thay vì ép vuông — ảnh ngang hiện
	// trọn vẹn, không còn bị cắt hai bên như trước.
	const ratio = useImageRatio(images[0]);

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
				<div className="flex min-w-0 flex-1 flex-col">
					<div className="flex min-w-0 items-center gap-1.5">
						<Link
							to={`/profile/${post.userId}`}
							className="truncate text-sm font-semibold text-ink hover:text-muted"
						>
							{post.username || "Người dùng"}
						</Link>
						<span className="text-xs text-muted" aria-hidden="true">
							·
						</span>
						<PostLink
							postId={post.id}
							className="shrink-0 text-xs text-muted hover:text-ink"
						>
							{timeAgo(post.createdDate || post.created)}
						</PostLink>
						{a.privacy === "PRIVATE" && (
							<Lock size={12} className="shrink-0 text-muted" title="Bài viết riêng tư" />
						)}
					</div>
					<SharedFrom post={post} />
				</div>
				<PostMenu
					menuOpen={a.menuOpen}
					setMenuOpen={a.setMenuOpen}
					isOwner={a.isOwner}
					onEditClick={() => a.setEditOpen(true)}
					onDeleteClick={() => a.setConfirmOpen(true)}
					onReportClick={() => a.setReportOpen(true)}
				/>
			</div>

			{hasImages && (
				<div className="w-full bg-fill" style={{ aspectRatio: ratio }}>
					<PostImageGrid images={images} onOpen={a.setLightbox} />
				</div>
			)}

			{/* Bài chỉ có chữ thì không có ảnh để "đẩy" thanh hành động xuống, nên
			    caption phải lên trước — nếu không các nút sẽ dính ngay dưới tên
			    người đăng thay vì nằm dưới nội dung như Instagram. */}
			{!hasImages && (
				<div className="px-4 pb-1">
					<PostCaption
						userId={post.userId}
						username={post.username}
						content={a.content}
					/>
				</div>
			)}

			<ActionBar
				liked={a.liked}
				saved={a.saved}
				onToggleLike={a.toggleLike}
				onToggleSave={a.toggleSave}
				onShare={a.share}
				onRepost={() => a.setShareOpen(true)}
				reposting={a.reposting}
				likeCount={a.likeCount}
				onShowLikes={() => a.setLikesOpen(true)}
				onShowShares={() => a.setSharesOpen(true)}
				shareCount={a.shareCount}
				commentSlot={
					<PostLink
						postId={post.id}
						aria-label="Bình luận"
						className="flex items-center gap-1.5 text-ink transition-opacity hover:opacity-60"
					>
						<ChatCircle size={24} className="-scale-x-100" />
						<ActionCount value={a.commentCount} />
					</PostLink>
				}
			/>

			{(hasImages || a.commentCount > 0) && (
				<div className="px-4 pt-2">
					{hasImages && (
						<PostCaption
							userId={post.userId}
							username={post.username}
							content={a.content}
						/>
					)}
					{a.commentCount > 0 && (
						<PostLink
							postId={post.id}
							className="mt-1 block text-sm text-muted hover:text-ink"
						>
							Xem tất cả {a.commentCount} bình luận
						</PostLink>
					)}
				</div>
			)}

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

			<EditPostModal
				open={a.editOpen}
				onClose={() => a.setEditOpen(false)}
				initialContent={a.content}
				initialPrivacy={a.privacy}
				initialImages={a.images}
				onSave={a.saveEdit}
				loading={a.savingEdit}
			/>

			<DeleteConfirmModal
				open={a.confirmOpen}
				onClose={() => a.setConfirmOpen(false)}
				onConfirm={a.doDelete}
				loading={a.deleting}
			/>

			<ReportModal
				open={a.reportOpen}
				onClose={() => a.setReportOpen(false)}
				targetType="POST"
				targetId={post.id}
			/>

			<LikesModal
				open={a.likesOpen}
				onClose={() => a.setLikesOpen(false)}
				postId={post.id}
			/>

			<SharePostModal
				open={a.shareOpen}
				onClose={() => a.setShareOpen(false)}
				post={post}
				onSubmit={a.doRepost}
				loading={a.reposting}
			/>

			<SharesModal
				open={a.sharesOpen}
				onClose={() => a.setSharesOpen(false)}
				postId={post.id}
			/>
		</Card>
	);
}

// Detail-page rendering: two columns on `md+` (image left, thread right),
// stacked on mobile. Mirrors Instagram's post-detail modal.
function PostDetailCard({ post, onDeleted }) {
	const a = usePostActions(post, onDeleted);
	const toast = useToast();
	// Lấy từ state của usePostActions, không phải từ prop: sửa bài xong danh sách
	// ảnh phải đổi ngay trên chính thẻ này mà không cần tải lại feed.
	const images = a.images;
	const hasImages = images.length > 0;
	const ratio = useImageRatio(images[0]);
	const composerRef = useRef(null);

	const { comments, status, hasNext, loadingMore, loadMore, addComment, removeComment } =
		useComments(post.id);

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
		// Bài không có ảnh thì cột nội dung là thứ duy nhất còn lại, nên khung phải
		// hẹp lại và cột được giãn hết — giữ nguyên 935px/405px như bài có ảnh sẽ
		// chừa một mảng trắng to đùng bên phải.
		<Card
			className={cn(
				"mx-auto flex w-full flex-col overflow-hidden md:flex-row",
				// Có ảnh: chiều cao khung do tỉ lệ ảnh quyết định (xem useImageRatio),
				// 86vh chỉ còn là trần. Không ảnh: giữ chiều cao cố định như cũ.
				hasImages ? "max-w-[1100px] md:max-h-[86vh]" : "max-w-[620px] md:h-[86vh]",
			)}
		>
			{hasImages && (
				<div
					className="w-full shrink-0 bg-black md:h-auto md:min-w-0 md:flex-1"
					style={{ aspectRatio: ratio }}
				>
					<PostImageGrid images={images} variant="detail" />
				</div>
			)}

			<div
				className={cn(
					"flex min-h-0 w-full flex-1 flex-col",
					hasImages && "md:w-[460px] md:flex-none md:border-l md:border-line",
				)}
			>
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
					<PostMenu
						menuOpen={a.menuOpen}
						setMenuOpen={a.setMenuOpen}
						isOwner={a.isOwner}
						onEditClick={() => a.setEditOpen(true)}
						onDeleteClick={() => a.setConfirmOpen(true)}
						onReportClick={() => a.setReportOpen(true)}
					/>
				</div>

				<div className="flex-1 overflow-y-auto px-4 py-4">
					{a.content && (
						<div className="mb-4 flex items-start gap-3">
							<Avatar src={post.userAvatar} name={post.username} size="sm" />
							<PostCaption
								userId={post.userId}
								username={post.username}
								content={a.content}
								clamp={false}
							/>
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
						onDeleted={removeComment}
					/>
				</div>

				<div className="border-t border-line">
					<ActionBar
						liked={a.liked}
						saved={a.saved}
						onToggleLike={a.toggleLike}
						onToggleSave={a.toggleSave}
						onShare={a.share}
						onRepost={() => a.setShareOpen(true)}
						reposting={a.reposting}
						likeCount={a.likeCount}
						onShowLikes={() => a.setLikesOpen(true)}
						onShowShares={() => a.setSharesOpen(true)}
						shareCount={a.shareCount}
						commentSlot={
							<button
								type="button"
								onClick={() => composerRef.current?.focus()}
								aria-label="Bình luận"
								className="flex items-center gap-1.5 text-ink transition-opacity hover:opacity-60"
							>
								<ChatCircle size={24} className="-scale-x-100" />
								<ActionCount value={a.commentCount} />
							</button>
						}
					/>

					{/* Trang chi tiết dùng ngày tuyệt đối ("28 Tháng 7") như Instagram,
					    khác với feed vẫn dùng mốc tương đối ("3 phút trước"). */}
					<p className="px-4 pt-2 pb-3 text-xs text-faint">
						{postDate(post.createdDate || post.created)}
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

			<EditPostModal
				open={a.editOpen}
				onClose={() => a.setEditOpen(false)}
				initialContent={a.content}
				initialPrivacy={a.privacy}
				initialImages={a.images}
				onSave={a.saveEdit}
				loading={a.savingEdit}
			/>

			<DeleteConfirmModal
				open={a.confirmOpen}
				onClose={() => a.setConfirmOpen(false)}
				onConfirm={a.doDelete}
				loading={a.deleting}
			/>

			<ReportModal
				open={a.reportOpen}
				onClose={() => a.setReportOpen(false)}
				targetType="POST"
				targetId={post.id}
			/>

			<LikesModal
				open={a.likesOpen}
				onClose={() => a.setLikesOpen(false)}
				postId={post.id}
			/>

			<SharePostModal
				open={a.shareOpen}
				onClose={() => a.setShareOpen(false)}
				post={post}
				onSubmit={a.doRepost}
				loading={a.reposting}
			/>

			<SharesModal
				open={a.sharesOpen}
				onClose={() => a.setSharesOpen(false)}
				postId={post.id}
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
