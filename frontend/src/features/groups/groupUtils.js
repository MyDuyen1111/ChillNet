import { Globe, Lock, LockKey, Crown, ShieldCheck, User } from "@phosphor-icons/react";

// Chuẩn hoá danh sách trong PageResponse. group-service + post-service dùng field
// `data` (không phải `content`), nên đọc cả hai cho an toàn.
export function pageItems(res) {
	if (Array.isArray(res)) return res;
	return res?.data ?? res?.content ?? [];
}

export function pageTotalPages(res) {
	return res?.totalPages ?? 1;
}

// Backend đặt field boolean là `isMember`; Jackson có thể serialize thành `member`
// (bỏ tiền tố "is"), nên kiểm tra cả hai key.
export function isMemberOf(group) {
	return Boolean(group?.isMember ?? group?.member);
}

export function isOwner(group, userId) {
	return Boolean(userId) && group?.ownerId === userId;
}

export function currentRole(group) {
	return group?.memberRole?.role ?? null;
}

// Chỉ owner / ADMIN / MODERATOR mới xem + xử lý được yêu cầu tham gia.
export function canManage(group, userId) {
	if (isOwner(group, userId)) return true;
	const role = currentRole(group);
	return role === "ADMIN" || role === "MODERATOR";
}

const PRIVACY = {
	PUBLIC: { label: "Công khai", Icon: Globe, hint: "Ai cũng có thể tìm và xem nội dung." },
	CLOSED: { label: "Kín", Icon: LockKey, hint: "Tìm thấy được, nhưng cần tham gia mới xem." },
	PRIVATE: { label: "Riêng tư", Icon: Lock, hint: "Chỉ thành viên mới xem được." },
};

export function privacyMeta(privacy) {
	return PRIVACY[privacy] ?? PRIVACY.PUBLIC;
}

export const PRIVACY_OPTIONS = ["PUBLIC", "CLOSED", "PRIVATE"];

const ROLE = {
	ADMIN: { label: "Quản trị viên", Icon: Crown },
	MODERATOR: { label: "Điều hành viên", Icon: ShieldCheck },
	MEMBER: { label: "Thành viên", Icon: User },
};

export function roleMeta(role) {
	return ROLE[role] ?? ROLE.MEMBER;
}

// Ảnh bìa: dùng ảnh thật nếu có, nếu không dùng placeholder ổn định theo id nhóm.
export function coverUrl(group, w = 800, h = 300) {
	return group?.coverImageUrl || `https://picsum.photos/seed/group-${group?.id}/${w}/${h}`;
}

export function memberCountLabel(n) {
	return `${Number(n ?? 0).toLocaleString("vi-VN")} thành viên`;
}

// group-service trả thời gian dưới dạng chuỗi đã format sẵn ("5 minute(s) ago")
// hoặc ISO date cho mục cũ, KHÔNG phải timestamp ISO parse được. Chuyển sang tiếng Việt.
export function relTime(value) {
	if (!value) return "";
	const m = /^(\d+)\s+(second|minute|hour)\(s\)\s+ago$/.exec(value);
	if (m) {
		const unit = { second: "giây", minute: "phút", hour: "giờ" }[m[2]];
		return `${m[1]} ${unit} trước`;
	}
	const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (d) return `${d[3]}/${d[2]}/${d[1]}`;
	return value;
}
