import { useRef, useState } from "react";
import { Camera, Image as ImageIcon } from "@phosphor-icons/react";
import { Avatar, Button, Input, Modal, Textarea, useToast } from "../../../components/ui";
import { http, toFormData } from "../../../lib/api";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";
import { genderLabel } from "./profileUtils";

const GENDERS = ["Nam", "Nữ", "Khác"];

// Edit-profile dialog: text fields (PUT /users/my-profile) plus avatar and
// background uploads (PUT multipart, field name "file"). Images are previewed
// locally and only sent when the user saves.
export default function EditProfileModal({ open, profile, onClose, onSaved }) {
	const toast = useToast();
	const urlsRef = useRef([]);
	const avatarInput = useRef(null);
	const bgInput = useRef(null);

	const [form, setForm] = useState(() => ({
		firstName: profile?.firstName ?? "",
		lastName: profile?.lastName ?? "",
		dob: profile?.dob ?? "",
		gender: profile?.gender ?? "",
		city: profile?.city ?? "",
		country: profile?.country ?? "",
		phoneNumber: profile?.phoneNumber ?? "",
		website: profile?.website ?? "",
		bio: profile?.bio ?? "",
	}));
	const [avatarFile, setAvatarFile] = useState(null);
	const [bgFile, setBgFile] = useState(null);
	const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || "");
	const [bgPreview, setBgPreview] = useState(profile?.backgroundImage || "");
	const [saving, setSaving] = useState(false);

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

	function pickImage(file, setFile, setPreview) {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			toast.error("Vui lòng chọn tệp ảnh.");
			return;
		}
		const url = URL.createObjectURL(file);
		urlsRef.current.push(url);
		setFile(file);
		setPreview(url);
	}

	function cleanupUrls() {
		urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
		urlsRef.current = [];
	}

	function close() {
		if (saving) return;
		cleanupUrls();
		onClose?.();
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setSaving(true);
		try {
			await api.put(endpoints.profile.updateMyProfile, {
				firstName: form.firstName.trim() || null,
				lastName: form.lastName.trim() || null,
				dob: form.dob || null,
				gender: form.gender || null,
				city: form.city.trim() || null,
				country: form.country.trim() || null,
				phoneNumber: form.phoneNumber.trim() || null,
				website: form.website.trim() || null,
				bio: form.bio.trim() || null,
			});
			if (avatarFile) {
				await http.put(
					endpoints.profile.avatar,
					toFormData({ file: avatarFile }),
					{ headers: { "Content-Type": "multipart/form-data" } },
				);
			}
			if (bgFile) {
				await http.put(
					endpoints.profile.background,
					toFormData({ file: bgFile }),
					{ headers: { "Content-Type": "multipart/form-data" } },
				);
			}
			toast.success("Đã cập nhật trang cá nhân.");
			cleanupUrls();
			await onSaved?.();
			onClose?.();
		} catch (err) {
			toast.error(err?.message || "Cập nhật thất bại, thử lại sau.");
		} finally {
			setSaving(false);
		}
	}

	const name = displayName({ ...profile, ...form });
	const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";
	const selectCls =
		"h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 transition-colors focus:border-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
	const extraGender = form.gender && !GENDERS.includes(form.gender);

	return (
		<Modal open={open} onClose={close} title="Chỉnh sửa trang cá nhân" size="lg">
			<form onSubmit={handleSubmit} className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
				{/* Cover + avatar pickers */}
				<div>
					<div className="relative h-36 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
						{bgPreview ? (
							<img src={bgPreview} alt="Ảnh bìa" className="h-full w-full object-cover" />
						) : (
							<div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-700" />
						)}
						<button
							type="button"
							onClick={() => bgInput.current?.click()}
							className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xl bg-zinc-950/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-zinc-950/75"
						>
							<ImageIcon size={16} />
							Đổi ảnh bìa
						</button>
						<input
							ref={bgInput}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => pickImage(e.target.files?.[0], setBgFile, setBgPreview)}
						/>
					</div>
					<div className="-mt-10 flex items-end gap-4 px-4">
						<div className="relative">
							<Avatar src={avatarPreview} name={name} size="xl" ring className="ring-4" />
							<button
								type="button"
								onClick={() => avatarInput.current?.click()}
								aria-label="Đổi ảnh đại diện"
								className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-500"
							>
								<Camera size={16} weight="fill" />
							</button>
							<input
								ref={avatarInput}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(e) => pickImage(e.target.files?.[0], setAvatarFile, setAvatarPreview)}
							/>
						</div>
						<p className="pb-1 text-xs text-zinc-500">
							Ảnh đại diện và ảnh bìa sẽ được cập nhật khi bạn lưu.
						</p>
					</div>
				</div>

				{/* Text fields */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input label="Họ" value={form.firstName} onChange={set("firstName")} placeholder="Nguyễn" />
					<Input label="Tên" value={form.lastName} onChange={set("lastName")} placeholder="An" />
					<Input label="Ngày sinh" type="date" value={form.dob} onChange={set("dob")} />
					<div className="flex flex-col gap-1.5">
						<label htmlFor="edit-gender" className={labelCls}>
							Giới tính
						</label>
						<select id="edit-gender" value={form.gender} onChange={set("gender")} className={selectCls}>
							<option value="">Chọn giới tính</option>
							{GENDERS.map((g) => (
								<option key={g} value={g}>
									{g}
								</option>
							))}
							{extraGender && <option value={form.gender}>{genderLabel(form.gender)}</option>}
						</select>
					</div>
					<Input label="Thành phố" value={form.city} onChange={set("city")} placeholder="Hồ Chí Minh" />
					<Input label="Quốc gia" value={form.country} onChange={set("country")} placeholder="Việt Nam" />
					<Input label="Số điện thoại" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="09xx xxx xxx" />
					<Input label="Website" value={form.website} onChange={set("website")} placeholder="chillnet.vn" />
				</div>
				<Textarea
					label="Tiểu sử"
					rows={3}
					value={form.bio}
					onChange={set("bio")}
					placeholder="Vài dòng giới thiệu về bạn..."
				/>

				<div className="flex justify-end gap-2 pt-1">
					<Button type="button" variant="ghost" onClick={close} disabled={saving}>
						Hủy
					</Button>
					<Button type="submit" variant="primary" loading={saving}>
						Lưu thay đổi
					</Button>
				</div>
			</form>
		</Modal>
	);
}
