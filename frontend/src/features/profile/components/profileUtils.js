// Small helpers shared across the profile feature. Kept local to the folder so
// the feature stays self-contained (no cross-feature imports).

// Format a LocalDate ("2000-01-15") or ISO datetime to Vietnamese "dd/mm/yyyy".
export function formatDate(value) {
	if (!value) return "";
	try {
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return "";
		return d.toLocaleDateString("vi-VN", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return "";
	}
}

// Compact number for follower/following stats (1200 -> "1.2k").
export function compactNumber(n) {
	const value = Number(n) || 0;
	if (value < 1000) return String(value);
	if (value < 1_000_000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
	return `${(value / 1_000_000).toFixed(1)}M`;
}

// Normalise UserSocialInfoResponse. Lombok + Jackson may serialise the boolean
// fields either as `isFollowing` or `following`, so we read both spellings.
export function socialFlags(info) {
	return {
		followers: info?.followersCount ?? 0,
		following: info?.followingCount ?? 0,
		friends: info?.friendsCount ?? 0,
		isFollowing: info?.isFollowing ?? info?.following ?? false,
		isFriend: info?.isFriend ?? info?.friend ?? false,
		isBlocked: info?.isBlocked ?? info?.blocked ?? false,
	};
}

// Free-text gender in the backend; map the common values to a Vietnamese label
// and fall back to whatever was stored.
export function genderLabel(gender) {
	if (!gender) return "";
	const key = String(gender).trim().toLowerCase();
	const map = {
		male: "Nam",
		nam: "Nam",
		female: "Nữ",
		"nữ": "Nữ",
		nu: "Nữ",
		other: "Khác",
		"khác": "Khác",
		khac: "Khác",
	};
	return map[key] ?? gender;
}
