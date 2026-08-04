import { useRef, useState } from "react";
import { ImageSquare, Check } from "@phosphor-icons/react";
import { Modal, Input, Textarea, Button } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { PRIVACY_OPTIONS, privacyMeta } from "../groupUtils";

// Modal tạo nhóm. Backend tạo nhóm bằng JSON, ảnh bìa upload riêng (PUT
// multipart) sau khi có id, nên onCreate nhận cả file để trang xử lý tuần tự.
export default function CreateGroupModal({ open, onClose, onCreate, submitting }) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [privacy, setPrivacy] = useState("PUBLIC");
	const [requiresApproval, setRequiresApproval] = useState(false);
	const [cover, setCover] = useState(null); // { file, url }
	const [avatar, setAvatar] = useState(null); // { file, url }
	const [error, setError] = useState("");
	const coverInput = useRef(null);
	const avatarInput = useRef(null);

	// Một handler cho cả hai ô ảnh; luôn thu hồi object URL cũ để không rò bộ nhớ.
	function pickImage(setter, current) {
		return (e) => {
			const file = e.target.files?.[0];
			if (!file) return;
			if (current?.url) URL.revokeObjectURL(current.url);
			setter({ file, url: URL.createObjectURL(file) });
		};
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

	return (
		<Modal open={open} onClose={handleClose} title="Tạo nhóm mới" size="lg">
			<form onSubmit={submit} className="space-y-5">
				{/* Ảnh đại diện chồng lên góc ảnh bìa, đúng thứ tự người dùng sẽ thấy lại
				    ở đầu trang nhóm. Hai nút phải là anh em, không lồng nhau. */}
				<div className="relative mb-10">
					<button
						type="button"
						onClick={() => coverInput.current?.click()}
						className="relative block aspect-video w-full overflow-hidden rounded-lg bg-fill"
					>
						{cover ? (
							<img src={cover.url} alt="" className="h-full w-full object-cover" />
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
						aria-label="Thêm ảnh đại diện nhóm"
						className="absolute -bottom-8 left-4 h-[72px] w-[72px] overflow-hidden rounded-full border-4 border-surface bg-fill-strong"
					>
						{avatar ? (
							<img src={avatar.url} alt="" className="h-full w-full object-cover" />
						) : (
							<span className="flex h-full w-full items-center justify-center text-muted">
								<ImageSquare size={20} />
							</span>
						)}
					</button>
				</div>
				<input
					ref={coverInput}
					type="file"
					accept="image/*"
					hidden
					onChange={pickImage(setCover, cover)}
				/>
				<input
					ref={avatarInput}
					type="file"
					accept="image/*"
					hidden
					onChange={pickImage(setAvatar, avatar)}
				/>

				<Input
					label="Tên nhóm"
					placeholder="Vd: Hội yêu nhạc indie"
					value={name}
					onChange={(e) => setName(e.target.value)}
					error={error}
					maxLength={100}
					autoFocus
				/>

				<Textarea
					label="Mô tả"
					placeholder="Nhóm này nói về điều gì?"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
					maxLength={500}
				/>

				<div className="space-y-2">
					<span className="text-sm font-semibold text-ink">Quyền riêng tư</span>
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
					<p className="text-xs text-muted">{privacyMeta(privacy).hint}</p>
				</div>

				<button
					type="button"
					onClick={() => setRequiresApproval((v) => !v)}
					className="flex w-full items-center justify-between border-t border-line py-3 text-left"
				>
					<span className="min-w-0">
						<span className="block text-sm font-medium text-ink">Cần phê duyệt thành viên</span>
						<span className="block text-xs text-muted">
							Người mới phải được quản trị viên duyệt trước khi tham gia.
						</span>
					</span>
					<span
						className={cn(
							"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
							requiresApproval ? "border-accent bg-accent text-white" : "border-line",
						)}
					>
						{requiresApproval && <Check size={12} weight="bold" />}
					</span>
				</button>

				<Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
					Tạo nhóm
				</Button>
			</form>
		</Modal>
	);
}
