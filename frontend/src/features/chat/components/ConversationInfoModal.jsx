import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, MagnifyingGlass, SignOut, Trash, UserMinus, UserPlus } from "@phosphor-icons/react";
import { Avatar, Button, Input, Modal, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";
import { conversationTitle, isGroup, participantName } from "../utils";

// Bảng thông tin cuộc trò chuyện — chỗ duy nhất gọi tới nhóm endpoint quản lý
// hội thoại của chat-service (đổi tên, thêm/xoá người, cấp/gỡ quyền admin, rời,
// xoá). Trước đây cả 7 endpoint này không được giao diện dùng tới.
//
// Phân quyền theo ConversationService:
//   - DIRECT: mọi người đều đổi tên / xoá được, nhưng KHÔNG thêm/xoá người.
//   - GROUP : chỉ ParticipantRole.ADMIN mới đổi tên, thêm/xoá người, cấp quyền, xoá.
const DEBOUNCE_MS = 350;

function PeoplePicker({ existingIds, onPick }) {
	const toast = useToast();
	const [draft, setDraft] = useState("");
	const [keyword, setKeyword] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setKeyword(draft.trim()), DEBOUNCE_MS);
		return () => clearTimeout(t);
	}, [draft]);

	useEffect(() => {
		if (!keyword) return setResults([]);
		let alive = true;
		setLoading(true);
		api.post(endpoints.profile.search, { keyword })
			.then((list) => alive && setResults(Array.isArray(list) ? list : []))
			.catch((e) => alive && toast.error(e.message || "Không tìm được người dùng."))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [keyword, toast]);

	return (
		<div className="space-y-2">
			<div className="relative">
				<MagnifyingGlass
					size={16}
					className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
				/>
				<input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Tìm người để thêm..."
					aria-label="Tìm người để thêm vào nhóm chat"
					className="h-9 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-muted"
				/>
			</div>
			{loading && <p className="text-xs text-muted">Đang tìm...</p>}
			{results
				.filter((p) => !existingIds.includes(p.userId))
				.slice(0, 6)
				.map((p) => (
					<div key={p.userId} className="flex items-center gap-2 py-1">
						<Avatar src={p.avatar} name={displayName(p)} size="sm" />
						<span className="min-w-0 flex-1 truncate text-sm text-ink">
							{p.username || displayName(p)}
						</span>
						<Button variant="link" size="sm" onClick={() => onPick(p)}>
							Thêm
						</Button>
					</div>
				))}
		</div>
	);
}

export default function ConversationInfoModal({
	open,
	onClose,
	conversation,
	currentUserId,
	onUpdated,
	onGone,
}) {
	const toast = useToast();
	const [name, setName] = useState("");
	const [busy, setBusy] = useState(null);
	const [adding, setAdding] = useState(false);
	const [confirm, setConfirm] = useState(null); // "leave" | "delete" | null

	useEffect(() => {
		if (open) {
			setName(conversation?.conversationName ?? "");
			setAdding(false);
			setConfirm(null);
		}
	}, [open, conversation]);

	if (!conversation) return null;

	const group = isGroup(conversation);
	const participants = conversation.participants ?? [];
	const me = participants.find((p) => p.userId === currentUserId);
	// DIRECT: backend không kiểm tra quyền admin, ai cũng sửa/xoá được.
	const isAdmin = !group || me?.role === "ADMIN";
	const title = conversationTitle(conversation, currentUserId);

	async function run(key, fn, successMsg) {
		setBusy(key);
		try {
			const result = await fn();
			if (successMsg) toast.success(successMsg);
			return result;
		} catch (e) {
			toast.error(e.message || "Thao tác thất bại.");
			throw e;
		} finally {
			setBusy(null);
		}
	}

	const rename = async () => {
		const next = name.trim();
		if (!next || next === conversation.conversationName) return;
		const updated = await run(
			"rename",
			() => api.put(endpoints.chat.conversationById(conversation.id), { conversationName: next }),
			"Đã đổi tên cuộc trò chuyện.",
		).catch(() => null);
		if (updated) onUpdated?.(updated);
	};

	const addParticipant = async (profile) => {
		const updated = await run(
			"add",
			() =>
				api.post(endpoints.chat.participants(conversation.id), {
					participantIds: [profile.userId],
				}),
			`Đã thêm ${profile.username || displayName(profile)}.`,
		).catch(() => null);
		if (updated) onUpdated?.(updated);
	};

	const removeParticipant = async (p) => {
		const updated = await run(
			`remove-${p.userId}`,
			() => api.delete(endpoints.chat.participant(conversation.id, p.userId)),
			"Đã xoá khỏi cuộc trò chuyện.",
		).catch(() => null);
		if (updated) onUpdated?.(updated);
	};

	const toggleAdmin = async (p) => {
		const promote = p.role !== "ADMIN";
		const updated = await run(
			`admin-${p.userId}`,
			() =>
				promote
					? api.post(endpoints.chat.admins(conversation.id), { participantIds: [p.userId] })
					: api.delete(endpoints.chat.admin(conversation.id, p.userId)),
			promote ? "Đã cấp quyền quản trị." : "Đã gỡ quyền quản trị.",
		).catch(() => null);
		if (updated) onUpdated?.(updated);
	};

	const leave = async () => {
		await run("leave", () => api.post(endpoints.chat.leaveConversation(conversation.id)), "Đã rời cuộc trò chuyện.")
			.then(() => onGone?.())
			.catch(() => {});
	};

	const remove = async () => {
		await run("delete", () => api.delete(endpoints.chat.conversationById(conversation.id)), "Đã xoá cuộc trò chuyện.")
			.then(() => onGone?.())
			.catch(() => {});
	};

	return (
		<Modal open={open} onClose={() => !busy && onClose()} title="Thông tin cuộc trò chuyện" size="sm">
			<div className="space-y-5">
				{isAdmin && (
					<div className="flex items-end gap-2">
						<div className="flex-1">
							<Input
								label="Tên cuộc trò chuyện"
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={100}
								placeholder={title}
							/>
						</div>
						<Button
							onClick={rename}
							loading={busy === "rename"}
							disabled={!name.trim() || name.trim() === conversation.conversationName}
						>
							Lưu
						</Button>
					</div>
				)}

				<div>
					<div className="mb-2 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-ink">
							Thành viên ({participants.length})
						</h3>
						{group && isAdmin && (
							<Button variant="link" size="sm" onClick={() => setAdding((v) => !v)}>
								<UserPlus size={14} />
								{adding ? "Đóng" : "Thêm"}
							</Button>
						)}
					</div>

					{adding && (
						<div className="mb-3 rounded-lg border border-line p-2">
							<PeoplePicker
								existingIds={participants.map((p) => p.userId)}
								onPick={addParticipant}
							/>
						</div>
					)}

					<div className="divide-y divide-line">
						{participants.map((p) => {
							const isMe = p.userId === currentUserId;
							return (
								<div key={p.userId} className="flex items-center gap-2 py-2">
									<Link to={`/profile/${p.userId}`} onClick={onClose} className="shrink-0">
										<Avatar src={p.avatar} name={participantName(p)} size="sm" />
									</Link>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm text-ink">
											{participantName(p)}
											{isMe && <span className="text-muted"> (bạn)</span>}
										</span>
										{p.role === "ADMIN" && (
											<span className="flex items-center gap-1 text-xs text-muted">
												<Crown size={11} weight="fill" /> Quản trị viên
											</span>
										)}
									</span>
									{group && isAdmin && !isMe && (
										<>
											<Button
												variant="ghost"
												size="icon"
												title={p.role === "ADMIN" ? "Gỡ quyền quản trị" : "Cấp quyền quản trị"}
												loading={busy === `admin-${p.userId}`}
												onClick={() => toggleAdmin(p)}
											>
												<Crown size={16} weight={p.role === "ADMIN" ? "fill" : "regular"} />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												title="Xoá khỏi cuộc trò chuyện"
												loading={busy === `remove-${p.userId}`}
												onClick={() => removeParticipant(p)}
											>
												<UserMinus size={16} className="text-like" />
											</Button>
										</>
									)}
								</div>
							);
						})}
					</div>
				</div>

				<div className="space-y-2 border-t border-line pt-4">
					{confirm ? (
						<div className="space-y-3">
							<p className="text-sm text-like">
								{confirm === "leave"
									? "Bạn sẽ rời khỏi cuộc trò chuyện này và không nhận tin nhắn mới nữa."
									: "Xoá cuộc trò chuyện sẽ gỡ nó khỏi mọi thành viên. Không thể hoàn tác."}
							</p>
							<div className="flex gap-2">
								<Button variant="secondary" onClick={() => setConfirm(null)} disabled={!!busy}>
									Huỷ
								</Button>
								<Button
									variant="danger"
									loading={busy === confirm}
									onClick={confirm === "leave" ? leave : remove}
								>
									{confirm === "leave" ? "Rời" : "Xoá"}
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-wrap gap-2">
							{group && (
								<Button variant="secondary" onClick={() => setConfirm("leave")}>
									<SignOut size={16} />
									Rời cuộc trò chuyện
								</Button>
							)}
							{isAdmin && (
								<Button variant="ghost" className="text-like" onClick={() => setConfirm("delete")}>
									<Trash size={16} />
									Xoá cuộc trò chuyện
								</Button>
							)}
						</div>
					)}
				</div>
			</div>
		</Modal>
	);
}
