import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { UserCircle } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Skeleton } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { displayName } from "../../lib/format";
import ProfileHeader from "./components/ProfileHeader";
import EditProfileModal from "./components/EditProfileModal";
import PostsTab from "./components/PostsTab";
import AboutTab from "./components/AboutTab";

const TABS = [
	{ key: "posts", label: "Bài viết" },
	{ key: "about", label: "Giới thiệu" },
];

function HeaderSkeleton() {
	return (
		<Card className="overflow-hidden">
			<Skeleton className="h-44 w-full rounded-none sm:h-56" />
			<div className="px-4 pb-5 sm:px-6">
				<Skeleton className="-mt-14 h-24 w-24 rounded-full ring-4 ring-white dark:ring-zinc-900" />
				<div className="mt-3 space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="mt-4 flex gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
				</div>
			</div>
		</Card>
	);
}

export default function ProfilePage() {
	const { userId: routeUserId } = useParams();
	const { userId: myId } = useAuth();
	const reduce = useReducedMotion();

	const isSelf = !routeUserId || routeUserId === myId;

	const [profile, setProfile] = useState(null);
	const [social, setSocial] = useState(null);
	const [status, setStatus] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [tab, setTab] = useState("posts");
	const [editOpen, setEditOpen] = useState(false);

	const fetchProfile = useCallback(
		() =>
			isSelf
				? api.get(endpoints.profile.myProfile)
				: api.get(endpoints.profile.byId(routeUserId)),
		[isSelf, routeUserId],
	);

	// Best-effort social info + friendship status (a failure here must not blank
	// the whole page, so we read them with allSettled).
	const fetchSocial = useCallback(
		async (uid) => {
			const [info, st] = await Promise.allSettled([
				api.get(endpoints.social.followInfo(uid)),
				isSelf ? Promise.resolve(null) : api.get(endpoints.social.friendStatus(uid)),
			]);
			setSocial(info.status === "fulfilled" ? info.value : null);
			setStatus(st.status === "fulfilled" ? st.value : null);
		},
		[isSelf],
	);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const prof = await fetchProfile();
			setProfile(prof);
			await fetchSocial(prof.userId || routeUserId || myId);
		} catch (err) {
			setError(err?.message || "Không tải được trang cá nhân.");
		} finally {
			setLoading(false);
		}
	}, [fetchProfile, fetchSocial, routeUserId, myId]);

	// Silent refresh (no skeleton flash) after edits or relationship changes.
	const refresh = useCallback(async () => {
		try {
			const prof = await fetchProfile();
			setProfile(prof);
			await fetchSocial(prof.userId || routeUserId || myId);
		} catch {
			// Keep the current data; the acting component already surfaced a toast.
		}
	}, [fetchProfile, fetchSocial, routeUserId, myId]);

	useEffect(() => {
		setTab("posts");
		load();
	}, [load]);

	if (loading) {
		return (
			<div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
				<HeaderSkeleton />
				<Card className="p-4">
					<div className="space-y-3">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-4/5" />
						<Skeleton className="h-40 w-full rounded-xl" />
					</div>
				</Card>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-6">
				<EmptyState
					icon={UserCircle}
					title="Không tìm thấy trang cá nhân"
					description={error || "Người dùng này không tồn tại hoặc đã bị xóa."}
					action={
						<Button variant="outline" size="sm" onClick={load}>
							Thử lại
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
			<ProfileHeader
				profile={profile}
				social={social}
				status={status}
				isSelf={isSelf}
				onEdit={() => setEditOpen(true)}
				onRelationChange={refresh}
			/>

			{/* Tabs */}
			<div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
				{TABS.map((t) => {
					const active = tab === t.key;
					return (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={
								"relative px-4 py-3 text-sm font-semibold transition-colors " +
								(active
									? "text-brand-600 dark:text-brand-400"
									: "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")
							}
						>
							{t.label}
							{active && (
								<motion.span
									layoutId={reduce ? undefined : "profile-tab-underline"}
									className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 dark:bg-brand-400"
								/>
							)}
						</button>
					);
				})}
			</div>

			{tab === "posts" ? (
				<PostsTab
					userId={profile.userId}
					authorName={displayName(profile)}
					authorAvatar={profile.avatar}
					isSelf={isSelf}
				/>
			) : (
				<AboutTab profile={profile} />
			)}

			{isSelf && editOpen && (
				<EditProfileModal
					open={editOpen}
					profile={profile}
					onClose={() => setEditOpen(false)}
					onSaved={refresh}
				/>
			)}
		</div>
	);
}
