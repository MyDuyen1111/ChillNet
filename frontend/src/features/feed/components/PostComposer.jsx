import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, X } from "@phosphor-icons/react";
import { Avatar, Button, Modal, Textarea, useToast } from "../../../components/ui";
import api, { http, toFormData } from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";

const MAX_IMAGES = 4;

// Instagram's "create post" dialog: a drop zone that turns into an image grid
// + caption once photos are picked. Opened by `FeedPage` from `?create=1` or
// the story tray's "+" button. Sends multipart (`/post/create`) when photos
// are attached, otherwise the lighter JSON endpoint.
export default function PostComposer({ open, onClose, onCreated }) {
	const { user } = useAuth();
	const toast = useToast();
	const fileRef = useRef(null);

	const [content, setContent] = useState("");
	const [attachments, setAttachments] = useState([]); // { file, url }
	const [submitting, setSubmitting] = useState(false);

	const profile = user?.profile;
	const name = displayName(profile);
	const avatar = profile?.avatar || profile?.avatarUrl || profile?.imageUrl;

	// Reset the draft each time the modal closes so it opens fresh next time.
	useEffect(() => {
		if (open) return;
		setContent("");
		setAttachments((prev) => {
			prev.forEach((a) => URL.revokeObjectURL(a.url));
			return [];
		});
	}, [open]);

	// Free any remaining object URLs when the composer unmounts.
	useEffect(() => {
		return () => attachments.forEach((a) => URL.revokeObjectURL(a.url));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const pickFiles = (e) => {
		const chosen = Array.from(e.target.files || []).filter((f) =>
			f.type.startsWith("image/"),
		);
		e.target.value = "";
		if (!chosen.length) return;
		const room = MAX_IMAGES - attachments.length;
		if (chosen.length > room) {
			toast(`Chỉ đính kèm tối đa ${MAX_IMAGES} ảnh.`);
		}
		const next = chosen.slice(0, room).map((file) => ({
			file,
			url: URL.createObjectURL(file),
		}));
		setAttachments((prev) => [...prev, ...next]);
	};

	const removeAt = (idx) => {
		setAttachments((prev) => {
			URL.revokeObjectURL(prev[idx]?.url);
			return prev.filter((_, i) => i !== idx);
		});
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
			toast.success("Đã đăng bài viết.");
			onCreated?.(created);
		} catch (err) {
			toast.error(err?.message || "Không đăng được bài, thử lại sau.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal open={open} onClose={onClose} title="Tạo bài viết mới" size="md">
			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={pickFiles}
			/>

			<div className="flex items-center gap-3 border-b border-line-soft pb-3">
				<Avatar src={avatar} name={name} size="sm" />
				<span className="text-sm font-semibold text-ink">{name}</span>
			</div>

			{attachments.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
					<span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-line text-faint">
						<ImageIcon size={30} weight="light" />
					</span>
					<p className="text-base text-ink">Kéo ảnh và video vào đây</p>
					<Button type="button" onClick={() => fileRef.current?.click()}>
						Chọn từ máy tính
					</Button>
				</div>
			) : (
				<div className="py-3">
					<div className="grid grid-cols-4 gap-2">
						{attachments.map((a, i) => (
							<div key={a.url} className="group relative aspect-square overflow-hidden rounded">
								<img
									src={a.url}
									alt={`Ảnh đính kèm ${i + 1}`}
									className="h-full w-full object-cover"
								/>
								<button
									type="button"
									onClick={() => removeAt(i)}
									aria-label="Gỡ ảnh"
									className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-opacity hover:opacity-80"
								>
									<X size={12} />
								</button>
							</div>
						))}
						{attachments.length < MAX_IMAGES && (
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								aria-label="Thêm ảnh"
								className="flex aspect-square items-center justify-center rounded border border-dashed border-line text-faint hover:text-muted"
							>
								<ImageIcon size={22} weight="light" />
							</button>
						)}
					</div>

					<Textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						rows={3}
						placeholder="Viết chú thích..."
						aria-label="Nội dung bài viết"
						className="mt-3"
					/>
				</div>
			)}

			<div className="mt-2 flex justify-end border-t border-line-soft pt-3">
				<Button type="button" onClick={submit} loading={submitting} disabled={!canSubmit}>
					Đăng
				</Button>
			</div>
		</Modal>
	);
}
