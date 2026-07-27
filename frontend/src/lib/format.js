import { formatDistanceToNow } from "date-fns";
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

// Prefer full name, fall back to username. Mirrors the backend's display logic.
export function displayName(profile) {
	if (!profile) return "Người dùng";
	const full = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
	return full || profile.username || "Người dùng";
}
