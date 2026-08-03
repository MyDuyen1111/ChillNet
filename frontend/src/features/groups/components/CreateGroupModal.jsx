import { useRef, useState } from "react";
import { Camera, ImageSquare, Check } from "@phosphor-icons/react";
import { Modal, Input, Textarea, Button, Avatar } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { PRIVACY_OPTIONS, privacyMeta } from "../groupUtils";

// Modal tạo nhóm. Backend tạo nhóm bằng JSON, ảnh avatar/cover upload riêng
// (PUT multipart) sau khi có id, nên onCreate nhận cả file để trang xử lý tuần tự.
export default function CreateGroupModal({ open, onClose, onCreate, submitting }) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [privacy, setPrivacy] = useState("PUBLIC");
	const [requiresApproval, setRequiresApproval] = useState(false);
	const [cover, setCover] = useState(null); // { file, url }
	const [avatar, setAvatar] = useState(null);
	const [error, setError] = useState("");
	const coverInput = useRef(null);
	const avatarInput = useRef(null);

	function pickImage(e, current, setter) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (current?.url) URL.revokeObjectURL(current.url);
		setter({ file, url: URL.createObjectURL(file) });
	}

	function reset() {
		if (cover?.url) URL.revokeObjectURL(cover.url);
		if (avatar?.url) URL.revokeObjectURL(avatar.url);
		setName("");
		setDescription("");
		setPrivacy("PUBLIC");
		setRequiresApproval(false);
		setCover(null);
		setAvatar(null);
		setError("");
	}

	function handleClose() {
		if (submitting) return;
		onClose();
	}

	async function submit(e) {
		e.preventDefault();
		if (!name.trim()) {
			setError("Vui lòng nhập tên nhóm.");
			return;
		}
		setError("");
		try {
			await onCreate({
				payload: {
					name: name.trim(),
					description: description.trim() || null,
					privacy,
					requiresApproval,
				},
				coverFile: cover?.file,
				avatarFile: avatar?.file,
			});
			reset();
		} catch {
			// Trang cha đã hiển thị toast lỗi; giữ nguyên form để thử lại.
		}
	}

	const privacyHint = privacyMeta(privacy).hint;

	return (
		<Modal open={open} onClose={handleClose} title="Tạo nhóm mới" size="lg">
			<form onSubmit={submit} className="space-y-5">
				{/* Ảnh bìa + avatar với preview */}
				<div className="relative">
					<button
						type="button"
						onClick={() => coverInput.current?.click()}
						className="group relative block h-28 w-full overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50"
					>
						{cover ? (
							<img src={cover.url} alt="" className="h-full w-full object-cover" />
						) : (
							<span className="flex h-full flex-col items-center justify-center gap-1 text-zinc-400">
								<ImageSquare size={22} />
								<span className="text-xs font-medium">Thêm ảnh bìa</span>
							</span>
						)}
						<span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
							<Camera size={12} weight="bold" /> Đổi
						</span>
					</button>

					<button
						type="button"
						onClick={() => avatarInput.current?.click()}
						className="absolute -bottom-5 left-4 rounded-full"
						aria-label="Thêm ảnh đại diện nhóm"
					>
						<span className="relative block">
							<Avatar
								src={avatar?.url}
								name={name || "Nhóm"}
								size="lg"
								ring
								className="border border-white dark:border-zinc-900"
							/>
							<span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white dark:ring-zinc-900">
								<Camera size={12} weight="bold" />
							</span>
						</span>
					</button>

					<input
						ref={coverInput}
						type="file"
						accept="image/*"
						hidden
						onChange={(e) => pickImage(e, cover, setCover)}
					/>
					<input
						ref={avatarInput}
						type="file"
						accept="image/*"
						hidden
						onChange={(e) => pickImage(e, avatar, setAvatar)}
					/>
				</div>

				<div className="pt-4">
					<Input
						label="Tên nhóm"
						placeholder="Vd: Hội yêu nhạc indie"
						value={name}
						onChange={(e) => setName(e.target.value)}
						error={error}
						maxLength={100}
						autoFocus
					/>
				</div>

				<Textarea
					label="Mô tả"
					placeholder="Nhóm này nói về điều gì?"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
					maxLength={500}
				/>

				<div className="space-y-2">
					<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
						Quyền riêng tư
					</span>
					<div className="grid grid-cols-3 gap-2">
						{PRIVACY_OPTIONS.map((p) => {
							const meta = privacyMeta(p);
							const Icon = meta.Icon;
							const active = privacy === p;
							return (
								<button
									key={p}
									type="button"
									onClick={() => setPrivacy(p)}
									aria-pressed={active}
									className={cn(
										"flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors",
										active
											? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
											: "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600",
									)}
								>
									<Icon size={20} weight={active ? "fill" : "regular"} />
									<span className="text-xs font-semibold">{meta.label}</span>
								</button>
							);
						})}
					</div>
					<p className="text-xs text-zinc-500">{privacyHint}</p>
				</div>

				<button
					type="button"
					onClick={() => setRequiresApproval((v) => !v)}
					className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
				>
					<span
						className={cn(
							"flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
							requiresApproval
								? "border-brand-600 bg-brand-600 text-white"
								: "border-zinc-300 dark:border-zinc-600",
						)}
					>
						{requiresApproval && <Check size={13} weight="bold" />}
					</span>
					<span className="min-w-0">
						<span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
							Cần phê duyệt thành viên
						</span>
						<span className="block text-xs text-zinc-500">
							Người mới phải được quản trị viên duyệt trước khi tham gia.
						</span>
					</span>
				</button>

				<div className="flex justify-end gap-2 pt-1">
					<Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
						Huỷ
					</Button>
					<Button type="submit" variant="primary" loading={submitting}>
						Tạo nhóm
					</Button>
				</div>
			</form>
		</Modal>
	);
}
