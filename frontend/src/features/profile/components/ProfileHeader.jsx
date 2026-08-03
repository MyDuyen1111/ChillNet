import { MapPin, PencilSimple } from "@phosphor-icons/react";
import { Avatar, Button, Card } from "../../../components/ui";
import { displayName } from "../../../lib/format";
import RelationshipActions from "./RelationshipActions";
import { compactNumber, socialFlags } from "./profileUtils";

function Stat({ value, label }) {
	return (
		<div className="flex items-baseline gap-1.5">
			<span className="font-mono text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
				{compactNumber(value)}
			</span>
			<span className="text-sm text-zinc-500">{label}</span>
		</div>
	);
}

export default function ProfileHeader({ profile, social, status, isSelf, onEdit, onRelationChange }) {
	const flags = socialFlags(social);
	const name = displayName(profile);
	const location = [profile.city, profile.country].filter(Boolean).join(", ");

	return (
		<Card className="overflow-hidden">
			{/* Cover */}
			<div className="relative h-44 bg-gradient-to-br from-brand-400 to-brand-700 sm:h-56">
				{profile.backgroundImage && (
					<img
						src={profile.backgroundImage}
						alt="Ảnh bìa"
						className="h-full w-full object-cover"
					/>
				)}
			</div>

			<div className="px-4 pb-5 sm:px-6">
				{/* Avatar row + actions */}
				<div className="flex flex-wrap items-end justify-between gap-3">
					<Avatar
						src={profile.avatar}
						name={name}
						size="xl"
						className="-mt-14 ring-4 ring-white dark:ring-zinc-900"
					/>
					<div className="ml-auto pt-3">
						{isSelf ? (
							<Button variant="outline" size="md" onClick={onEdit}>
								<PencilSimple size={18} />
								Chỉnh sửa trang cá nhân
							</Button>
						) : (
							<RelationshipActions
								userId={profile.userId}
								status={status}
								isFollowing={flags.isFollowing}
								onChanged={onRelationChange}
							/>
						)}
					</div>
				</div>

				{/* Identity */}
				<div className="mt-3 space-y-1">
					<h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
						{name}
					</h1>
					{profile.username && (
						<p className="font-mono text-sm text-zinc-500">@{profile.username}</p>
					)}
					{profile.bio && (
						<p className="whitespace-pre-wrap pt-1 text-sm text-zinc-700 dark:text-zinc-300">
							{profile.bio}
						</p>
					)}
					{location && (
						<p className="inline-flex items-center gap-1 pt-0.5 text-sm text-zinc-500">
							<MapPin size={15} />
							{location}
						</p>
					)}
				</div>

				{/* Stats */}
				<div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
					<Stat value={flags.followers} label="Người theo dõi" />
					<Stat value={flags.following} label="Đang theo dõi" />
					<Stat value={flags.friends} label="Bạn bè" />
				</div>
			</div>
		</Card>
	);
}
