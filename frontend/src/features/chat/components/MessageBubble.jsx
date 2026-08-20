import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowBendUpLeft, DotsThree, PencilSimple, Smiley, Trash } from "@phosphor-icons/react";
import { Avatar, IconButton } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { participantName } from "../utils";

// One chat bubble. Mine = right-aligned accent fill; others = left-aligned
// neutral fill. `showName`/`showAvatar` are driven by run-grouping in
// ChatWindow so stacked messages from the same sender read as one block.
//
// Kebab menu chỉ mở ra khi thật sự có việc để làm: chat-service cho SỬA tin của
// chính mình (validateSender) và cho XOÁ nếu là chủ tin HOẶC admin của cuộc trò
// chuyện (validateDeletePermission) — nên hai quyền này tách riêng.
export default function MessageBubble({
	message,
	group,
	showName,
	showAvatar,
	canDelete = false,
	onEdit,
	onDeleteRequest,
}) {
	const reduce = useReducedMotion();
	const mine = message.me;
	const name = participantName(message.sender);
	// Not populated by the backend today (text-only messages); kept so the
	// bubble renders correctly the moment an image field is added.
	const isImage = !!message.imageUrl;

	const [menuOpen, setMenuOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(message.message ?? "");
	const [saving, setSaving] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	// Tin đang gửi (optimistic) chưa có id thật nên chưa sửa/xoá được.
	const canEdit = mine && !message.pending && typeof onEdit === "function";
	const mayDelete = (mine || canDelete) && !message.pending && typeof onDeleteRequest === "function";
	const hasMenu = canEdit || mayDelete;

	const submitEdit = async () => {
		const text = draft.trim();
		if (!text || saving) return;
		if (text === message.message) return setEditing(false);
		setSaving(true);
		try {
			await onEdit(message, text);
			setEditing(false);
		} catch {
			// ChatPage đã hiện toast lỗi.
		} finally {
			setSaving(false);
		}
	};

	const actions = (
		<div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
			<IconButton label="Thả cảm xúc">
				<Smiley size={16} className="text-muted" />
			</IconButton>
			<IconButton label="Trả lời">
				<ArrowBendUpLeft size={16} className="text-muted" />
			</IconButton>
			{hasMenu && (
				<div className="relative">
					<IconButton label="Thêm tuỳ chọn" onClick={() => setMenuOpen((v) => !v)}>
						<DotsThree size={16} className="text-muted" />
					</IconButton>
					<AnimatePresence>
						{menuOpen && (
							<>
								<div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
								<motion.div
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									transition={{ duration: 0.12 }}
									className="absolute bottom-8 right-0 z-20 w-36 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
								>
									{canEdit && (
										<button
											type="button"
											onClick={() => {
												setMenuOpen(false);
												setDraft(message.message ?? "");
												setEditing(true);
											}}
											className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-hover"
										>
											<PencilSimple size={16} />
											Sửa
										</button>
									)}
									{mayDelete && (
										<button
											type="button"
											onClick={() => {
												setMenuOpen(false);
												onDeleteRequest(message);
											}}
											className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-like hover:bg-hover"
										>
											<Trash size={16} />
											Xoá
										</button>
									)}
								</motion.div>
							</>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className={cn(
				"group flex w-full items-end gap-2",
				mine ? "justify-end" : "justify-start",
			)}
		>
			{!mine &&
				(showAvatar ? (
					<Avatar src={message.sender?.avatar} name={name} size="xs" />
				) : (
					<span className="w-6 shrink-0" aria-hidden="true" />
				))}

			{mine && !editing && actions}

			<div className={cn("flex max-w-[65%] flex-col", mine && "items-end")}>
				{group && showName && !mine && (
					<span className="mb-0.5 ml-1 text-xs text-muted">{name}</span>
				)}
				{editing ? (
					<div className="flex w-full flex-col gap-1">
						<input
							ref={inputRef}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									submitEdit();
								}
								if (e.key === "Escape") {
									setDraft(message.message ?? "");
									setEditing(false);
								}
							}}
							disabled={saving}
							aria-label="Sửa tin nhắn"
							className="w-full rounded-[22px] border border-line bg-canvas px-4 py-2 text-sm text-ink focus:border-muted"
						/>
						<span className="px-2 text-xs text-muted">
							<button type="button" onClick={submitEdit} className="font-semibold text-accent">
								Lưu
							</button>
							{" · "}
							<button
								type="button"
								onClick={() => {
									setDraft(message.message ?? "");
									setEditing(false);
								}}
								className="font-semibold"
							>
								Huỷ
							</button>
						</span>
					</div>
				) : isImage ? (
					<div className="max-w-[250px] overflow-hidden rounded-[22px]">
						<img
							src={message.imageUrl}
							alt="Hình ảnh"
							className="w-full object-cover"
						/>
					</div>
				) : (
					<div
						className={cn(
							"whitespace-pre-wrap break-words rounded-[22px] px-4 py-2 text-sm",
							mine ? "bg-accent text-white" : "bg-fill text-ink",
							message.pending && "opacity-70",
						)}
					>
						{message.message}
					</div>
				)}
				{message.pending && (
					<span className="mt-0.5 px-1 text-xs text-muted">Đang gửi...</span>
				)}
			</div>

			{!mine && !editing && actions}
		</motion.div>
	);
}
