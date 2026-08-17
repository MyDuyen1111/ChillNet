import { useEffect, useRef, useState } from "react";
import {
	ArrowLeft,
	CaretLeft,
	CaretRight,
	Image as ImageIcon,
	Plus,
	X,
} from "@phosphor-icons/react";
import { Avatar, Button, Modal, useToast } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import api, { http, toFormData } from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";

const MAX_IMAGES = 4;
const MAX_CAPTION = 2200;

const count = (n) => n.toLocaleString("vi-VN");

// Instagram's "create post" dialog, hai bước: bước chọn ảnh (drop zone toàn
// khung) rồi bước soạn bài (ảnh bên trái, chú thích bên phải). Mở bởi
// `FeedPage` từ `?create=1` hoặc nút "+" trên story tray. Gửi multipart
// (`/post/create`) khi có ảnh, không thì dùng endpoint JSON nhẹ hơn.
export default function PostComposer({ open, onClose, onCreated }) {
	const { user } = useAuth();
	const toast = useToast();
	const fileRef = useRef(null);
	const liveRef = useRef([]); // ảnh hiện tại, để thu hồi object URL lúc unmount

	const [step, setStep] = useState("pick"); // "pick" | "compose"
	const [content, setContent] = useState("");
	const [attachments, setAttachments] = useState([]); // { file, url }
	const [active, setActive] = useState(0);
	const [dragging, setDragging] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const profile = user?.profile;
	const name = displayName(profile);
	const avatar = profile?.avatar || profile?.avatarUrl || profile?.imageUrl;

	// Reset the draft each time the modal closes so it opens fresh next time.
	useEffect(() => {
		if (open) return;
		setStep("pick");
		setContent("");
		setActive(0);
		setDragging(false);
		setAttachments((prev) => {
			prev.forEach((a) => URL.revokeObjectURL(a.url));
			return [];
		});
	}, [open]);

	// Free any remaining object URLs when the composer unmounts.
	useEffect(() => {
		liveRef.current = attachments;
	}, [attachments]);
	useEffect(() => {
		return () => liveRef.current.forEach((a) => URL.revokeObjectURL(a.url));
	}, []);

	const addFiles = (list) => {
		const all = Array.from(list || []);
		const chosen = all.filter((f) => f.type.startsWith("image/"));
		if (!chosen.length) {
			if (all.length) toast.error("Chỉ hỗ trợ tệp ảnh.");
			return;
		}
		const room = MAX_IMAGES - attachments.length;
		if (room <= 0) {
			toast(`Chỉ đính kèm tối đa ${MAX_IMAGES} ảnh.`);
			return;
		}
		if (chosen.length > room) {
			toast(`Chỉ đính kèm tối đa ${MAX_IMAGES} ảnh.`);
		}
		const next = chosen.slice(0, room).map((file) => ({
			file,
			url: URL.createObjectURL(file),
		}));
		setActive(attachments.length); // nhảy tới ảnh vừa thêm
		setAttachments((prev) => [...prev, ...next]);
		setStep("compose");
	};

	const pickFiles = (e) => {
		// Phải sao chép FileList ra mảng TRƯỚC khi reset value: gán value = ""
		// xoá luôn `input.files`, mà `e.target.files` chỉ là tham chiếu tới nó.
		const list = Array.from(e.target.files || []);
		e.target.value = "";
		addFiles(list);
	};

	const removeAt = (idx) => {
		URL.revokeObjectURL(attachments[idx]?.url);
		const next = attachments.filter((_, i) => i !== idx);
		setAttachments(next);
		setActive((cur) => Math.min(cur > idx ? cur - 1 : cur, Math.max(0, next.length - 1)));
	};

	const onDrop = (e) => {
		e.preventDefault();
		setDragging(false);
		addFiles(e.dataTransfer?.files);
	};

	const dropProps = {
		onDragOver: (e) => {
			e.preventDefault();
			setDragging(true);
		},
		onDragLeave: () => setDragging(false),
		onDrop,
	};

	const go = (delta) => {
		if (attachments.length < 2) return;
		setActive((cur) => (cur + delta + attachments.length) % attachments.length);
	};

	const canSubmit = (content.trim().length > 0 || attachments.length > 0) && !submitting;

	const submit = async () => {
		if (!canSubmit) return;
		setSubmitting(true);
		try {
			let created;
			if (attachments.length > 0) {
				const form = toFormData({
					content: content.trim(),
					images: attachments.map((a) => a.file),
				});
				const res = await http.post(endpoints.post.create, form, {
					headers: { "Content-Type": "multipart/form-data" },
				});
				created = res.data?.result;
			} else {
				created = await api.post(endpoints.post.createJson, {
					content: content.trim(),
				});
			}
			// post-service nuốt lỗi upload ảnh (chỉ log rồi vẫn lưu bài), nên bài
			// trả về không có imageUrls là dấu hiệu duy nhất báo ảnh đã rớt. Không
			// cảnh báo thì người đăng tưởng ảnh lên bình thường.
			if (attachments.length > 0 && !(created?.imageUrls?.length > 0)) {
				toast.error("Đã đăng bài nhưng tải ảnh lên thất bại, kiểm tra file-service và MinIO.");
			} else {
				toast.success("Đã đăng bài viết.");
			}
			onCreated?.(created);
		} catch (err) {
			toast.error(err?.message || "Không đăng được bài, thử lại sau.");
		} finally {
			setSubmitting(false);
		}
	};

	const composing = step === "compose";
	const current = attachments[active];

	return (
		<Modal
			open={open}
			onClose={submitting ? () => {} : onClose}
			size={composing ? "xl" : "md"}
			bodyClassName=""
		>
			<input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />

			{/* Header riêng thay cho `title` của Modal: cần thêm nút quay lại bên
			    trái và nút "Chia sẻ" bên phải như dialog của Instagram. */}
			<div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
				<div className="flex w-16 shrink-0 justify-start">
					{composing && (
						<button
							type="button"
							onClick={() => setStep("pick")}
							disabled={submitting}
							aria-label="Quay lại"
							className="text-ink transition-opacity hover:opacity-60 disabled:opacity-40"
						>
							<ArrowLeft size={22} />
						</button>
					)}
				</div>
				<h2 className="flex-1 truncate text-center text-base font-semibold text-ink">
					Tạo bài viết mới
				</h2>
				<div className="flex w-16 shrink-0 justify-end">
					{composing && (
						<Button variant="link" onClick={submit} loading={submitting} disabled={!canSubmit}>
							Chia sẻ
						</Button>
					)}
				</div>
			</div>

			{!composing ? (
				<div
					{...dropProps}
					className={cn(
						"flex flex-col items-center justify-center gap-4 px-6 py-20 text-center transition-colors",
						dragging && "bg-hover",
					)}
				>
					<span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-line text-faint">
						<ImageIcon size={38} weight="light" />
					</span>
					<p className="text-[22px] font-light text-ink">Kéo ảnh vào đây</p>
					<Button type="button" onClick={() => fileRef.current?.click()}>
						Chọn từ máy tính
					</Button>
					<Button type="button" variant="link" onClick={() => setStep("compose")}>
						Chỉ viết chữ, không kèm ảnh
					</Button>
				</div>
			) : (
				<div className="flex flex-col md:h-[540px] md:flex-row">
					{/* Cột ảnh */}
					<div
						{...dropProps}
						className={cn(
							"group relative flex aspect-square w-full shrink-0 items-center justify-center md:aspect-auto md:h-full md:w-[540px]",
							current ? "bg-black" : "bg-canvas",
							dragging && "opacity-80",
						)}
					>
						{current ? (
							<>
								<img
									key={current.url}
									src={current.url}
									alt={`Ảnh đính kèm ${active + 1}`}
									className="h-full w-full object-contain"
								/>

								<button
									type="button"
									onClick={() => removeAt(active)}
									aria-label="Gỡ ảnh"
									className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white transition-opacity hover:opacity-70"
								>
									<X size={14} />
								</button>

								{attachments.length > 1 && (
									<>
										<button
											type="button"
											onClick={() => go(-1)}
											aria-label="Ảnh trước"
											className="absolute left-3 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100"
										>
											<CaretLeft size={20} />
										</button>
										<button
											type="button"
											onClick={() => go(1)}
											aria-label="Ảnh sau"
											className="absolute right-3 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100"
										>
											<CaretRight size={20} />
										</button>
										<span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
											{attachments.map((a, i) => (
												<span
													key={a.url}
													className={cn(
														"h-1.5 w-1.5 rounded-full transition-opacity",
														i === active ? "bg-white" : "bg-white/40",
													)}
												/>
											))}
										</span>
									</>
								)}
							</>
						) : (
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								className="flex h-full w-full flex-col items-center justify-center gap-3 text-faint transition-colors hover:text-muted"
							>
								<span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line">
									<ImageIcon size={30} weight="light" />
								</span>
								<span className="text-sm">Thêm ảnh cho bài viết</span>
							</button>
						)}
					</div>

					{/* Cột chú thích */}
					<div className="flex min-w-0 flex-1 flex-col border-line md:border-l">
						<div className="flex items-center gap-3 px-4 py-3">
							<Avatar src={avatar} name={name} size="xs" />
							<span className="truncate text-sm font-semibold text-ink">{name}</span>
						</div>

						<textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
							}}
							maxLength={MAX_CAPTION}
							placeholder="Viết chú thích..."
							aria-label="Nội dung bài viết"
							autoFocus
							className="min-h-[140px] w-full flex-1 resize-none bg-transparent px-4 text-sm text-ink placeholder:text-faint focus:outline-none"
						/>

						<div className="flex items-center justify-end px-4 pb-3 pt-1">
							<span className="text-xs text-faint">
								{count(content.length)}/{count(MAX_CAPTION)}
							</span>
						</div>

						{attachments.length > 0 && (
							<div className="flex items-center gap-2 overflow-x-auto border-t border-line-soft px-4 py-3">
								{attachments.map((a, i) => (
									<div key={a.url} className="relative shrink-0">
										<button
											type="button"
											onClick={() => setActive(i)}
											aria-label={`Xem ảnh ${i + 1}`}
											className={cn(
												"block h-14 w-14 overflow-hidden rounded border transition-opacity",
												i === active ? "border-ink" : "border-line hover:opacity-70",
											)}
										>
											<img src={a.url} alt="" className="h-full w-full object-cover" />
										</button>
										<button
											type="button"
											onClick={() => removeAt(i)}
											aria-label={`Gỡ ảnh ${i + 1}`}
											className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white transition-opacity hover:opacity-70"
										>
											<X size={10} />
										</button>
									</div>
								))}
								{attachments.length < MAX_IMAGES && (
									<button
										type="button"
										onClick={() => fileRef.current?.click()}
										aria-label="Thêm ảnh"
										className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-dashed border-line text-faint transition-colors hover:text-muted"
									>
										<Plus size={18} />
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</Modal>
	);
}
