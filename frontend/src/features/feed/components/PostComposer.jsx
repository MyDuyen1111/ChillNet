import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ImageSquare, PaperPlaneRight, X } from "@phosphor-icons/react";
import { Avatar, Button, Card, Textarea, useToast } from "../../../components/ui";
import api, { http, toFormData } from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";

const MAX_IMAGES = 4;

// Top-of-feed composer. Sends multipart (`/post/create`, fields `content` +
// `images`) when photos are attached, otherwise the lighter JSON endpoint.
export default function PostComposer({ onCreated }) {
	const { user } = useAuth();
	const toast = useToast();
	const fileRef = useRef(null);
	const reduce = useReducedMotion();

	const [content, setContent] = useState("");
	const [attachments, setAttachments] = useState([]); // { file, url }
	const [submitting, setSubmitting] = useState(false);

	const profile = user?.profile;
	const name = displayName(profile);
	const avatar = profile?.avatar || profile?.avatarUrl || profile?.imageUrl;

	// Free the object URLs when the composer unmounts.
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
			toast(`Chỉ đính kèm tối đa ${MAX_IMAGES} ảnh.`, { type: "info" });
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
			onCreated?.(created);
			attachments.forEach((a) => URL.revokeObjectURL(a.url));
			setAttachments([]);
			setContent("");
			toast.success("Đã đăng bài viết.");
		} catch (err) {
			toast.error(err?.message || "Không đăng được bài, thử lại sau.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card className="p-4">
			<div className="flex gap-3">
				<Avatar src={avatar} name={name} size="md" />
				<div className="min-w-0 flex-1">
					<Textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						rows={3}
						placeholder="Bạn đang nghĩ gì?"
						aria-label="Nội dung bài viết"
					/>

					<AnimatePresence initial={false}>
						{attachments.length > 0 && (
							<motion.div
								initial={reduce ? false : { opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className="mt-3 grid grid-cols-4 gap-2 overflow-hidden"
							>
								{attachments.map((a, i) => (
									<div
										key={a.url}
										className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10"
									>
										<img
											src={a.url}
											alt={`Ảnh đính kèm ${i + 1}`}
											className="h-full w-full object-cover"
										/>
										<button
											type="button"
											onClick={() => removeAt(i)}
											aria-label="Gỡ ảnh"
											className="absolute right-1 top-1 rounded-full bg-zinc-950/60 p-1 text-white transition-colors hover:bg-zinc-950/80"
										>
											<X size={14} />
										</button>
									</div>
								))}
							</motion.div>
						)}
					</AnimatePresence>

					<div className="mt-3 flex items-center justify-between">
						<div>
							<input
								ref={fileRef}
								type="file"
								accept="image/*"
								multiple
								hidden
								onChange={pickFiles}
							/>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => fileRef.current?.click()}
								disabled={attachments.length >= MAX_IMAGES}
							>
								<ImageSquare size={18} weight="bold" />
								Ảnh
								<span className="font-mono text-xs text-zinc-400">
									{attachments.length}/{MAX_IMAGES}
								</span>
							</Button>
						</div>
						<Button
							type="button"
							size="sm"
							onClick={submit}
							loading={submitting}
							disabled={!canSubmit}
						>
							<PaperPlaneRight size={16} weight="fill" />
							Đăng
						</Button>
					</div>
				</div>
			</div>
		</Card>
	);
}
