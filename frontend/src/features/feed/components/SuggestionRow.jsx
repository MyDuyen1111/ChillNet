import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";

// One row in the right rail's "Gợi ý cho bạn" list. Follow is optimistic and
// local only (there is no dedicated "am I following" read here, matching the
// same simplification `UserCard` in the friends feature already makes).
export default function SuggestionRow({ suggestion }) {
	const toast = useToast();
	const [following, setFollowing] = useState(false);
	const [busy, setBusy] = useState(false);

	const profile = suggestion.profile ?? suggestion;
	const name = displayName(profile);

	const toggleFollow = async () => {
		if (busy) return;
		setBusy(true);
		const next = !following;
		try {
			if (next) await api.post(endpoints.social.follow(suggestion.userId));
			else await api.delete(endpoints.social.unfollow(suggestion.userId));
			setFollowing(next);
		} catch (err) {
			toast.error(err?.message || "Không thực hiện được, thử lại.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="flex items-center gap-3">
			<Link to={`/profile/${suggestion.userId}`} className="shrink-0">
				<Avatar src={profile?.avatar} name={name} size="md" />
			</Link>
			<div className="min-w-0 flex-1">
				<Link
					to={`/profile/${suggestion.userId}`}
					className="block truncate text-sm font-semibold text-ink hover:text-muted"
				>
					{profile?.username || name}
				</Link>
				<p className="truncate text-xs text-muted">{name}</p>
			</div>
			<Button
				type="button"
				variant="link"
				size="sm"
				disabled={busy}
				onClick={toggleFollow}
				className="shrink-0"
			>
				{following ? "Đang theo dõi" : "Theo dõi"}
			</Button>
		</div>
	);
}
