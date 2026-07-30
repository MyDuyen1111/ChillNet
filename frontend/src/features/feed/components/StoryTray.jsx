import { Link } from "react-router-dom";
import { Plus } from "@phosphor-icons/react";
import { Avatar, Card, Skeleton } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";
import { useFriends } from "../hooks/useFriends";

// Instagram's story rail, rebuilt from real data: the current user opens the
// composer, everyone else is a friend (no fake stories). Hidden entirely once
// we know there are no friends to show.
export default function StoryTray({ onCreateClick }) {
	const { user } = useAuth();
	const { friends, status } = useFriends();
	const profile = user?.profile;
	const name = displayName(profile);

	if (status === "ready" && friends.length === 0) return null;

	return (
		<Card className="mb-4">
			<div className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				<button
					type="button"
					onClick={onCreateClick}
					className="flex w-16 shrink-0 flex-col items-center gap-1.5"
				>
					<span className="relative">
						<Avatar src={profile?.avatar} name={name} size="lg" />
						<span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent text-white">
							<Plus size={12} weight="bold" />
						</span>
					</span>
					<span className="w-16 truncate text-center text-xs text-ink">Tin của bạn</span>
				</button>

				{status === "loading" &&
					Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
							<Skeleton className="h-14 w-14 rounded-full" />
							<Skeleton className="h-2.5 w-10" />
						</div>
					))}

				{status === "ready" &&
					friends.map((f) => (
						<Link
							key={f.userId}
							to={`/profile/${f.userId}`}
							className="flex w-16 shrink-0 flex-col items-center gap-1.5"
						>
							<Avatar
								src={f.profile?.avatar}
								name={displayName(f.profile)}
								size="lg"
								ring="story"
							/>
							<span className="w-16 truncate text-center text-xs text-ink">
								{f.profile?.username || displayName(f.profile)}
							</span>
						</Link>
					))}
			</div>
		</Card>
	);
}
