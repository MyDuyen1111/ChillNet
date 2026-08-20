import { useEffect, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Avatar, Button, Input, Modal, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";

// Tạo cuộc trò chuyện mới. chat-service tự quyết định loại: chọn đúng 1 người
// thì thành DIRECT, từ 2 người trở lên thành GROUP (ConversationService.create),
// nên giao diện chỉ cần một luồng duy nhất và chỉ hỏi tên khi có nhiều người.
//
// Nếu DIRECT đã tồn tại, backend trả lại đúng hội thoại cũ (findOrCreate) chứ
// không tạo bản trùng.
const DEBOUNCE_MS = 350;

export default function NewConversationModal({ open, onClose, onCreated }) {
	const toast = useToast();
	const [draft, setDraft] = useState("");
	const [keyword, setKeyword] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [picked, setPicked] = useState([]);
	const [name, setName] = useState("");
	const [creating, setCreating] = useState(false);

	useEffect(() => {
		if (open) return;
		setDraft("");
		setKeyword("");
		setResults([]);
		setPicked([]);
		setName("");
	}, [open]);

	useEffect(() => {
		const t = setTimeout(() => setKeyword(draft.trim()), DEBOUNCE_MS);
		return () => clearTimeout(t);
	}, [draft]);

	useEffect(() => {
		if (!open || !keyword) return setResults([]);
		let alive = true;
		setLoading(true);
		api.post(endpoints.profile.search, { keyword })
			.then((list) => alive && setResults(Array.isArray(list) ? list : []))
			.catch((e) => alive && toast.error(e.message || "Không tìm được người dùng."))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [open, keyword, toast]);

	const toggle = (profile) =>
		setPicked((prev) =>
			prev.some((p) => p.userId === profile.userId)
				? prev.filter((p) => p.userId !== profile.userId)
				: [...prev, profile],
		);

	const create = async () => {
		if (picked.length === 0) return;
		setCreating(true);
		try {
			const conversation = await api.post(endpoints.chat.conversations, {
				participantIds: picked.map((p) => p.userId),
				// Tên chỉ có ý nghĩa với nhóm; DIRECT lấy tên người kia ở backend.
				conversationName: picked.length > 1 ? name.trim() || null : null,
			});
			if (!conversation?.id) throw new Error("Không tạo được cuộc trò chuyện.");
			onCreated(conversation);
		} catch (e) {
			toast.error(e.message || "Không tạo được cuộc trò chuyện.");
		} finally {
			setCreating(false);
		}
	};

	return (
		<Modal open={open} onClose={() => !creating && onClose()} title="Tin nhắn mới" size="sm">
			<div className="space-y-3">
				{picked.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{picked.map((p) => (
							<span
								key={p.userId}
								className="flex items-center gap-1 rounded-full bg-fill px-2 py-1 text-xs text-ink"
							>
								{p.username || displayName(p)}
								<button
									type="button"
									onClick={() => toggle(p)}
									aria-label={`Bỏ chọn ${p.username || displayName(p)}`}
								>
									<X size={11} weight="bold" />
								</button>
							</span>
						))}
					</div>
				)}

				{picked.length > 1 && (
					<Input
						label="Tên nhóm chat"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={100}
						placeholder="Không bắt buộc"
					/>
				)}

				<div className="relative">
					<MagnifyingGlass
						size={16}
						className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
					/>
					<input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder="Tìm người để nhắn tin..."
						aria-label="Tìm người dùng"
						autoFocus
						className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-muted"
					/>
				</div>

				<div className="max-h-[40vh] overflow-y-auto">
					{loading ? (
						<div className="space-y-3 py-2">
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex items-center gap-3">
									<Skeleton className="h-10 w-10 rounded-full" />
									<Skeleton className="h-3.5 w-32" />
								</div>
							))}
						</div>
					) : !keyword ? (
						<p className="py-6 text-center text-sm text-muted">
							Nhập tên để tìm người bạn muốn nhắn tin.
						</p>
					) : results.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted">Không tìm thấy ai phù hợp.</p>
					) : (
						<div className="divide-y divide-line">
							{results.map((p) => {
								const selected = picked.some((x) => x.userId === p.userId);
								return (
									<button
										key={p.userId}
										type="button"
										onClick={() => toggle(p)}
										className="flex w-full items-center gap-3 py-2.5 text-left"
									>
										<Avatar src={p.avatar} name={displayName(p)} size="md" />
										<span className="min-w-0 flex-1 truncate text-sm text-ink">
											{p.username || displayName(p)}
										</span>
										<span
											className={
												selected
													? "text-xs font-semibold text-accent"
													: "text-xs text-muted"
											}
										>
											{selected ? "Đã chọn" : "Chọn"}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</div>

				<Button
					className="w-full"
					size="lg"
					loading={creating}
					disabled={picked.length === 0}
					onClick={create}
				>
					{picked.length > 1 ? "Tạo nhóm chat" : "Bắt đầu trò chuyện"}
				</Button>
			</div>
		</Modal>
	);
}
