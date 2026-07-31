import { useRef, useState } from "react";
import { Avatar, Button, Input, Modal, Textarea, useToast } from "../../../components/ui";
import { http, toFormData } from "../../../lib/api";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";
import { genderLabel } from "./profileUtils";

const GENDERS = ["Nam", "Nữ", "Khác"];

// One "label left, field right" row, Instagram's edit-profile page layout.
// The label only moves to the right column and right-aligns from `md` up;
// on mobile it sits above the field like a normal form label.
function FieldRow({ label, htmlFor, children }) {
	return (
		<div className="grid grid-cols-1 gap-1.5 py-3.5 md:grid-cols-[160px_1fr] md:items-start md:gap-6">
			{label ? (
				<label htmlFor={htmlFor} className="text-sm font-semibold text-ink md:pt-2 md:text-right">
					{label}
				</label>
			) : (
				<div className="hidden md:block" />
			)}
			<div>{children}</div>
		</div>
	);
}

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
	const selectCls =
		"h-10 w-full rounded border border-line bg-canvas px-3 text-sm text-ink transition-colors focus:border-muted";
	const extraGender = form.gender && !GENDERS.includes(form.gender);

	return (
		<Modal open={open} onClose={close} title="Chỉnh sửa trang cá nhân" size="lg">
			<form onSubmit={handleSubmit} className="max-h-[72vh] divide-y divide-line-soft overflow-y-auto pr-1">
				{/* Avatar */}
				<FieldRow>
					<div className="flex items-center gap-4">
						<Avatar src={avatarPreview} name={name} size="lg" />
						<div className="space-y-1">
							<p className="text-sm font-semibold text-ink">{profile?.username || name}</p>
							<Button
								type="button"
								variant="link"
								size="sm"
								className="px-0"
								onClick={() => avatarInput.current?.click()}
							>
								Đổi ảnh đại diện
							</Button>
						</div>
						<input
							ref={avatarInput}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => pickImage(e.target.files?.[0], setAvatarFile, setAvatarPreview)}
						/>
					</div>
				</FieldRow>

				{/* Background image, still editable here even though it no longer shows in the header */}
				<FieldRow label="Ảnh bìa">
					<div className="flex items-center gap-4">
						<div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-fill">
							{bgPreview && (
								<img src={bgPreview} alt="Ảnh bìa" className="h-full w-full object-cover" />
							)}
						</div>
						<Button type="button" variant="secondary" size="sm" onClick={() => bgInput.current?.click()}>
							Đổi ảnh bìa
						</Button>
						<input
							ref={bgInput}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => pickImage(e.target.files?.[0], setBgFile, setBgPreview)}
						/>
					</div>
				</FieldRow>

				<FieldRow label="Họ" htmlFor="edit-firstName">
					<Input id="edit-firstName" value={form.firstName} onChange={set("firstName")} placeholder="Nguyễn" />
				</FieldRow>
				<FieldRow label="Tên" htmlFor="edit-lastName">
					<Input id="edit-lastName" value={form.lastName} onChange={set("lastName")} placeholder="An" />
				</FieldRow>
				<FieldRow label="Tiểu sử" htmlFor="edit-bio">
					<Textarea
						id="edit-bio"
						rows={3}
						value={form.bio}
						onChange={set("bio")}
						placeholder="Vài dòng giới thiệu về bạn..."
					/>
				</FieldRow>
				<FieldRow label="Ngày sinh" htmlFor="edit-dob">
					<Input id="edit-dob" type="date" value={form.dob} onChange={set("dob")} />
				</FieldRow>
				<FieldRow label="Giới tính" htmlFor="edit-gender">
					<select id="edit-gender" value={form.gender} onChange={set("gender")} className={selectCls}>
						<option value="">Chọn giới tính</option>
						{GENDERS.map((g) => (
							<option key={g} value={g}>
								{g}
							</option>
						))}
						{extraGender && <option value={form.gender}>{genderLabel(form.gender)}</option>}
					</select>
				</FieldRow>
				<FieldRow label="Thành phố" htmlFor="edit-city">
					<Input id="edit-city" value={form.city} onChange={set("city")} placeholder="Hồ Chí Minh" />
				</FieldRow>
				<FieldRow label="Quốc gia" htmlFor="edit-country">
					<Input id="edit-country" value={form.country} onChange={set("country")} placeholder="Việt Nam" />
				</FieldRow>
				<FieldRow label="Số điện thoại" htmlFor="edit-phone">
					<Input id="edit-phone" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="09xx xxx xxx" />
				</FieldRow>
				<FieldRow label="Website" htmlFor="edit-website">
					<Input id="edit-website" value={form.website} onChange={set("website")} placeholder="chillnet.vn" />
				</FieldRow>

				<FieldRow>
					<Button type="submit" variant="primary" loading={saving}>
						Gửi
					</Button>
				</FieldRow>
			</form>
		</Modal>
	);
}
