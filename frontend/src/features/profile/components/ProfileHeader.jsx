import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gear } from "@phosphor-icons/react";
import { Avatar, IconButton } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";
import RelationshipActions from "./RelationshipActions";
import FollowListModal from "./FollowListModal";
import { compactNumber, socialFlags } from "./profileUtils";

// Desktop stat: "42 bài viết". Có `onClick` thì thành nút mở danh sách.
function Stat({ value, label, onClick }) {
	const body = (
		<>
			<span className="font-semibold">{compactNumber(value)}</span> {label}
		</>
	);
	if (!onClick) return <span className="text-base text-ink">{body}</span>;
	return (
		<button type="button" onClick={onClick} className="text-base text-ink hover:opacity-70">
			{body}
		</button>
	);
}

// Mobile stat column, stacked number over label, used in the border-y strip.
function StatColumn({ value, label, onClick }) {
	const body = (
		<>
			<span className="text-base font-semibold text-ink">{compactNumber(value)}</span>
			<span className="text-xs text-muted">{label}</span>
		</>
	);
	const className = "flex flex-col items-center gap-0.5 py-0.5";
	if (!onClick) return <div className={className}>{body}</div>;
	return (
		<button type="button" onClick={onClick} className={className}>
			{body}
		</button>
	);
}

// "Bạn chung: A, B và 3 người khác" — GET /friendships/mutual/{id} trả về danh
// sách hồ sơ đầy đủ nên không cần lấy thêm gì.
function MutualFriends({ userId }) {
	const [list, setList] = useState([]);

	useEffect(() => {
		if (!userId) return;
		let alive = true;
		api.get(endpoints.social.mutualFriends(userId))
			.then((r) => alive && setList(Array.isArray(r) ? r : []))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [userId]);

	if (list.length === 0) return null;

	const shown = list.slice(0, 2);
	const rest = list.length - shown.length;

	return (
		<p className="text-sm text-muted">
			Bạn chung:{" "}
			{shown.map((p, i) => (
				<span key={p.userId}>
					{i > 0 && ", "}
					<Link to={`/profile/${p.userId}`} className="font-semibold text-ink hover:underline">
						{p.username || displayName(p)}
					</Link>
				</span>
			))}
			{rest > 0 && ` và ${rest} người khác`}
		</p>
	);
}

// Instagram never shows a cover photo on the profile header, so `profile.backgroundImage`
// is intentionally not read here (it is still editable from EditProfileModal).
export default function ProfileHeader({ profile, social, status, isSelf, postCount, onEdit, onRelationChange }) {
	// null | "followers" | "following"
	const [followList, setFollowList] = useState(null);
	const flags = socialFlags(social);
	const name = displayName(profile);
	const location = [profile.city, profile.country].filter(Boolean).join(", ");

	// Accounts with no real name fall back to the username, which would then be
	// printed twice in a row under the header. Show it only when it adds something.
	const showName = name && name !== profile.username;

	const bioBlock = (
		<div className="space-y-0.5">
			{showName && <p className="text-sm font-semibold text-ink">{name}</p>}
			{location && <p className="text-sm text-muted">{location}</p>}
			{profile.bio && <p className="whitespace-pre-line text-sm text-ink">{profile.bio}</p>}
			{!isSelf && <MutualFriends userId={profile.userId} />}
			{profile.website && (
				<a
					href={/^https?:\/\//i.test(profile.website) ? profile.website : `https://${profile.website}`}
					target="_blank"
					rel="noreferrer noopener"
					className="inline-block text-sm font-semibold text-accent-strong"
				>
					{profile.website}
				</a>
			)}
		</div>
	);

	return (
		<div>
			<div className="flex items-center gap-6 md:grid md:grid-cols-[290px_1fr] md:items-start md:gap-8">
				{/* Avatar */}
				<div className="flex shrink-0 justify-center md:w-[290px]">
					<Avatar src={profile.avatar} name={name} size="xl" className="md:hidden" />
					<Avatar src={profile.avatar} name={name} size="2xl" className="hidden md:flex" />
				</div>

				{/* Content column */}
				<div className="min-w-0 flex-1">
					{/* Row 1: username + actions */}
					<div className="flex flex-wrap items-center gap-4">
						<h1 className="text-xl font-normal text-ink">{profile.username || name}</h1>
						{isSelf ? (
							<RelationshipActions isSelf onEdit={onEdit} />
						) : (
							<RelationshipActions
								userId={profile.userId}
								status={status}
								isFollowing={flags.isFollowing}
								onChanged={onRelationChange}
							/>
						)}
						{isSelf && (
							<IconButton label="Cài đặt trang cá nhân" onClick={onEdit}>
								<Gear size={24} />
							</IconButton>
						)}
					</div>

					{/* Row 2: stats, desktop only (mobile version is the border-y strip below) */}
					<div className="mt-4 hidden gap-10 md:flex">
						<Stat value={postCount ?? 0} label="bài viết" />
						<Stat
							value={flags.followers}
							label="người theo dõi"
							onClick={() => setFollowList("followers")}
						/>
						<Stat
							value={flags.following}
							label="đang theo dõi"
							onClick={() => setFollowList("following")}
						/>
					</div>

					{/* Row 3: identity + bio, desktop only */}
					<div className="mt-4 hidden md:block">{bioBlock}</div>
				</div>
			</div>

			{/* Mobile: bio sits below the avatar row */}
			<div className="mt-4 md:hidden">{bioBlock}</div>

			{/* Mobile: stats collapse into a divided strip */}
			<div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3 md:hidden">
				<StatColumn value={postCount ?? 0} label="bài viết" />
				<StatColumn
					value={flags.followers}
					label="người theo dõi"
					onClick={() => setFollowList("followers")}
				/>
				<StatColumn
					value={flags.following}
					label="đang theo dõi"
					onClick={() => setFollowList("following")}
				/>
			</div>

			<FollowListModal
				open={followList !== null}
				onClose={() => setFollowList(null)}
				direction={followList}
				title={followList === "followers" ? "Người theo dõi" : "Đang theo dõi"}
				url={
					followList === "followers"
						? endpoints.social.followers(profile.userId)
						: endpoints.social.following(profile.userId)
				}
			/>
		</div>
	);
}
