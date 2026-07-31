import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IdentificationCard, SquaresFour, UserCircle } from "@phosphor-icons/react";
import { Button, EmptyState, Skeleton, Tabs } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import ProfileHeader from "./components/ProfileHeader";
import EditProfileModal from "./components/EditProfileModal";
import PostsTab from "./components/PostsTab";
import AboutTab from "./components/AboutTab";

const TABS = [
	{ key: "posts", label: "Bài viết", icon: SquaresFour },
	{ key: "about", label: "Giới thiệu", icon: IdentificationCard },
];

function HeaderSkeleton() {
	return (
		<div className="flex items-center gap-6 pb-8 md:grid md:grid-cols-[290px_1fr] md:items-start md:gap-8 md:pb-11">
			<div className="flex shrink-0 justify-center md:w-[290px]">
				<Skeleton className="h-[88px] w-[88px] rounded-full md:h-[150px] md:w-[150px]" />
			</div>
			<div className="flex-1 space-y-4">
				<Skeleton className="h-6 w-40" />
				<div className="hidden gap-10 md:flex">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-24" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-56" />
				</div>
			</div>
		</div>
	);
}

function GridSkeleton() {
	return (
		<div className="grid grid-cols-3 gap-1">
			{Array.from({ length: 9 }).map((_, i) => (
				<Skeleton key={i} className="aspect-square rounded-none" />
			))}
		</div>
	);
}

export default function ProfilePage() {
	const { userId: routeUserId } = useParams();
	const { userId: myId } = useAuth();

	const isSelf = !routeUserId || routeUserId === myId;

	const [profile, setProfile] = useState(null);
	const [social, setSocial] = useState(null);
	const [status, setStatus] = useState(null);
	const [postCount, setPostCount] = useState(null);
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
			<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
				<HeaderSkeleton />
				<div className="border-t border-line py-6">
					<GridSkeleton />
				</div>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
				<EmptyState
					icon={UserCircle}
					title="Không tìm thấy trang cá nhân"
					description={error || "Người dùng này không tồn tại hoặc đã bị xóa."}
					action={
						<Button variant="secondary" size="sm" onClick={load}>
							Thử lại
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
			<ProfileHeader
				profile={profile}
				social={social}
				status={status}
				isSelf={isSelf}
				postCount={postCount}
				onEdit={() => setEditOpen(true)}
				onRelationChange={refresh}
			/>

			<div className="mt-8">
				<Tabs items={TABS} value={tab} onChange={setTab} />
			</div>

			<div className="py-6">
				{tab === "posts" ? (
					<PostsTab userId={profile.userId} isSelf={isSelf} onCountChange={setPostCount} />
				) : (
					<AboutTab profile={profile} />
				)}
			</div>

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
