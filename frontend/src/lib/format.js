import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

// Relative time in Vietnamese: "3 phút trước".
export function timeAgo(value) {
	if (!value) return "";
	try {
		return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi });
	} catch {
		return "";
	}
}

// Mốc thời gian tuyệt đối kiểu Instagram ở trang chi tiết bài viết: "28 Tháng 7",
// kèm năm khi bài không thuộc năm nay ("28 Tháng 7, 2025").
export function postDate(value) {
	if (!value) return "";
	try {
		const date = new Date(value);
		const pattern = date.getFullYear() === new Date().getFullYear() ? "d 'Tháng' M" : "d 'Tháng' M, yyyy";
		return format(date, pattern, { locale: vi });
	} catch {
		return "";
	}
}

// Prefer full name, fall back to username. Mirrors the backend's display logic.
export function displayName(profile) {
	if (!profile) return "Người dùng";
	const full = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
	return full || profile.username || "Người dùng";
}
