import { useEffect, useRef, useState } from "react";
import { Check, ImageSquare, Trash } from "@phosphor-icons/react";
import { Button, Input, Modal, Textarea } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { PRIVACY_OPTIONS, privacyMeta } from "../groupUtils";

// Sửa nhóm. Chỉ chủ nhóm mở được: GroupService.updateGroup và deleteGroup đều
// ném GROUP_NOT_OWNER cho bất kỳ ai khác, kể cả ADMIN của nhóm.
//
// Ảnh bìa / ảnh đại diện KHÔNG nằm trong UpdateGroupRequest — chúng có endpoint
// multipart riêng — nên trang cha nhận file rồi gọi lần lượt, giống lúc tạo nhóm.
const TOGGLES = [
	{
		key: "requiresApproval",
		label: "Cần phê duyệt thành viên",
		hint: "Người mới phải được quản trị viên duyệt trước khi tham gia.",
	},
	{
		key: "allowPosting",
		label: "Cho phép đăng bài",
		hint: "Tắt thì không ai đăng được bài mới trong nhóm.",
	},
	{
		key: "onlyAdminCanPost",
		label: "Chỉ quản trị viên được đăng",
		hint: "Thành viên thường chỉ đọc và bình luận.",
	},
];

function Toggle({ label, hint, checked, onChange }) {
	return (
		<button
			type="button"
			onClick={onChange}
			className="flex w-full items-center justify-between gap-3 border-t border-line py-3 text-left"
		>
			<span className="min-w-0">
				<span className="block text-sm font-medium text-ink">{label}</span>
				<span className="block text-xs text-muted">{hint}</span>
			</span>
			<span
				className={cn(
					"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
					checked ? "border-accent bg-accent text-white" : "border-line",
				)}
			>
				{checked && <Check size={12} weight="bold" />}
			</span>
		</button>
	);
}

export default function EditGroupModal({ open, group, onClose, onSave, onDelete, submitting, deleting }) {
	const [form, setForm] = useState(null);
	const [cover, setCover] = useState(null); // { file, url }
	const [avatar, setAvatar] = useState(null);
	const [error, setError] = useState("");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const coverInput = useRef(null);
	const avatarInput = useRef(null);

	// Nạp lại từ nhóm hiện tại mỗi lần mở, để lần mở thứ hai không hiện dữ liệu cũ.
	useEffect(() => {
		if (!open || !group) return;
		setForm({
			name: group.name ?? "",
			description: group.description ?? "",
			privacy: group.privacy ?? "PUBLIC",
			requiresApproval: group.requiresApproval ?? false,
			allowPosting: group.allowPosting !== false,
			onlyAdminCanPost: group.onlyAdminCanPost ?? false,
		});
		setCover(null);
		setAvatar(null);
		setError("");
		setConfirmDelete(false);
	}, [open, group]);

	if (!form) return null;

	const busy = submitting || deleting;

	function pickImage(setter, current) {
		return (e) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (current?.url) URL.revokeObjectURL(current.url);
			setter({ file, url: URL.createObjectURL(file) });
		};
	}

	const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

	async function submit(e) {
		e.preventDefault();
		if (!form.name.trim()) return setError("Vui lòng nhập tên nhóm.");
		setError("");
		try {
			await onSave({
				payload: {
					name: form.name.trim(),
					description: form.description.trim(),
					privacy: form.privacy,
					requiresApproval: form.requiresApproval,
					allowPosting: form.allowPosting,
					onlyAdminCanPost: form.onlyAdminCanPost,
				},
				coverFile: cover?.file,
				avatarFile: avatar?.file,
			});
		} catch {
			// Trang cha đã hiện toast; giữ form để thử lại.
		}
	}

	const coverPreview = cover?.url || group.coverImageUrl;
	const avatarPreview = avatar?.url || group.avatarUrl;

	return (
		<Modal open={open} onClose={() => !busy && onClose()} title="Cài đặt nhóm" size="lg">
			<form onSubmit={submit} className="space-y-5">
				<div className="relative mb-10">
					<button
						type="button"
						onClick={() => coverInput.current?.click()}
						className="relative block aspect-video w-full overflow-hidden rounded-lg bg-fill"
					>
						{coverPreview ? (
							<img src={coverPreview} alt="" className="h-full w-full object-cover" />
						) : (
							<span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted">
								<span className="flex h-11 w-11 items-center justify-center rounded-full border border-line">
									<ImageSquare size={20} />
								</span>
								<span className="text-xs font-semibold">Thêm ảnh bìa</span>
							</span>
						)}
					</button>
					<button
						type="button"
						onClick={() => avatarInput.current?.click()}
						aria-label="Đổi ảnh đại diện nhóm"
						className="absolute -bottom-8 left-4 h-[72px] w-[72px] overflow-hidden rounded-full border-4 border-surface bg-fill-strong"
					>
						{avatarPreview ? (
							<img src={avatarPreview} alt="" className="h-full w-full object-cover" />
						) : (
							<span className="flex h-full w-full items-center justify-center text-muted">
								<ImageSquare size={20} />
							</span>
						)}
					</button>
				</div>
				<input ref={coverInput} type="file" accept="image/*" hidden onChange={pickImage(setCover, cover)} />
				<input ref={avatarInput} type="file" accept="image/*" hidden onChange={pickImage(setAvatar, avatar)} />

				<Input
					label="Tên nhóm"
					value={form.name}
					onChange={(e) => set("name", e.target.value)}
					error={error}
					maxLength={100}
				/>

				<Textarea
					label="Mô tả"
					value={form.description}
					onChange={(e) => set("description", e.target.value)}
					rows={3}
					maxLength={500}
				/>

				<div className="space-y-2">
					<span className="text-sm font-semibold text-ink">Quyền riêng tư</span>
					<div className="grid grid-cols-3 gap-2">
						{PRIVACY_OPTIONS.map((p) => {
							const meta = privacyMeta(p);
							const Icon = meta.Icon;
							const active = form.privacy === p;
							return (
								<button
									key={p}
									type="button"
									onClick={() => set("privacy", p)}
									aria-pressed={active}
									className={cn(
										"flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
										active
											? "border-ink bg-hover text-ink"
											: "border-line text-muted hover:border-muted hover:text-ink",
									)}
								>
									<Icon size={20} weight={active ? "fill" : "regular"} />
									<span className="text-xs font-semibold">{meta.label}</span>
								</button>
							);
						})}
					</div>
					<p className="text-xs text-muted">{privacyMeta(form.privacy).hint}</p>
				</div>

				<div>
					{TOGGLES.map((t) => (
						<Toggle
							key={t.key}
							label={t.label}
							hint={t.hint}
							checked={Boolean(form[t.key])}
							onChange={() => set(t.key, !form[t.key])}
						/>
					))}
				</div>

				<Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
					Lưu thay đổi
				</Button>

				{/* Xoá nhóm xoá luôn mọi thành viên và yêu cầu tham gia ở backend
				    (deleteGroup), nên phải qua một bước xác nhận riêng. */}
				<div className="border-t border-line pt-4">
					{confirmDelete ? (
						<div className="space-y-3">
							<p className="text-sm text-like">
								Xoá nhóm sẽ gỡ toàn bộ thành viên và yêu cầu tham gia. Không thể hoàn tác.
							</p>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="secondary"
									onClick={() => setConfirmDelete(false)}
									disabled={deleting}
								>
									Giữ lại nhóm
								</Button>
								<Button type="button" variant="danger" loading={deleting} onClick={onDelete}>
									Xoá vĩnh viễn
								</Button>
							</div>
						</div>
					) : (
						<Button
							type="button"
							variant="ghost"
							className="text-like"
							onClick={() => setConfirmDelete(true)}
							disabled={busy}
						>
							<Trash size={16} />
							Xoá nhóm
						</Button>
					)}
				</div>
			</form>
		</Modal>
	);
}
