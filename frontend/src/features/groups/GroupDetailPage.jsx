import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
	ArrowLeft,
	Users,
	UserPlus,
	Article,
	Crown,
	SignOut,
	Clock,
	UsersThree,
} from "@phosphor-icons/react";
import { Button, Avatar, Card, EmptyState, Skeleton, useToast } from "../../components/ui";
import { cn } from "../../lib/cn";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import {
	pageItems,
	pageTotalPages,
	isMemberOf,
	isOwner,
	canManage,
	privacyMeta,
	coverUrl,
	memberCountLabel,
} from "./groupUtils";
import MemberRow from "./components/MemberRow";
import JoinRequestRow from "./components/JoinRequestRow";
import GroupPostCard from "./components/GroupPostCard";
import { RowsSkeleton } from "./components/GroupSkeletons";

export default function GroupDetailPage() {
	const { groupId } = useParams();
	const { userId } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const reduce = useReducedMotion();

	const [group, setGroup] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState("members");
	const [busy, setBusy] = useState(false);
	const [pending, setPending] = useState(false);

	// Thành viên
	const [members, setMembers] = useState([]);
	const [membersLoading, setMembersLoading] = useState(false);
	const [membersLoaded, setMembersLoaded] = useState(false);
	const [membersPage, setMembersPage] = useState(1);
	const [membersTotalPages, setMembersTotalPages] = useState(1);
	const [membersMore, setMembersMore] = useState(false);

	// Yêu cầu tham gia
	const [requests, setRequests] = useState([]);
	const [requestsLoading, setRequestsLoading] = useState(false);
	const [requestsLoaded, setRequestsLoaded] = useState(false);
	const [requestBusyId, setRequestBusyId] = useState(null);

	// Bài viết
	const [posts, setPosts] = useState([]);
	const [postsLoading, setPostsLoading] = useState(false);
	const [postsLoaded, setPostsLoaded] = useState(false);
	const [postsPage, setPostsPage] = useState(1);
	const [postsTotalPages, setPostsTotalPages] = useState(1);
	const [postsMore, setPostsMore] = useState(false);

	// Tải nhóm (và reset dữ liệu tab khi đổi nhóm).
	useEffect(() => {
		let alive = true;
		setLoading(true);
		setError(null);
		setGroup(null);
		setPending(false);
		setActiveTab("members");
		setMembers([]);
		setMembersLoaded(false);
		setRequests([]);
		setRequestsLoaded(false);
		setPosts([]);
		setPostsLoaded(false);
		api
			.get(endpoints.group.byId(groupId))
			.then((g) => alive && setGroup(g))
			.catch((e) => alive && setError(e))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [groupId]);

	const canMng = canManage(group, userId);

	async function loadMembers(page) {
		if (page === 1) setMembersLoading(true);
		else setMembersMore(true);
		try {
			const r = await api.get(endpoints.group.members(groupId), { params: { page, size: 20 } });
			const items = pageItems(r);
			setMembers((prev) => (page === 1 ? items : [...prev, ...items]));
			setMembersPage(page);
			setMembersTotalPages(pageTotalPages(r));
			setMembersLoaded(true);
		} catch (e) {
			toast.error(e.message || "Không tải được thành viên.");
		} finally {
			setMembersLoading(false);
			setMembersMore(false);
		}
	}

	async function loadRequests() {
		setRequestsLoading(true);
		try {
			const r = await api.get(endpoints.group.joinRequests(groupId), { params: { page: 1, size: 50 } });
			setRequests(pageItems(r));
			setRequestsLoaded(true);
		} catch (e) {
			toast.error(e.message || "Không tải được yêu cầu tham gia.");
		} finally {
			setRequestsLoading(false);
		}
	}

	async function loadPosts(page) {
		if (page === 1) setPostsLoading(true);
		else setPostsMore(true);
		try {
			const r = await api.get(endpoints.post.byGroup(groupId), { params: { page, size: 10 } });
			const items = pageItems(r);
			setPosts((prev) => (page === 1 ? items : [...prev, ...items]));
			setPostsPage(page);
			setPostsTotalPages(pageTotalPages(r));
			setPostsLoaded(true);
		} catch (e) {
			toast.error(e.message || "Không tải được bài viết.");
		} finally {
			setPostsLoading(false);
			setPostsMore(false);
		}
	}

	// Nạp dữ liệu tab khi mở lần đầu.
	useEffect(() => {
		if (!group) return;
		if (activeTab === "members" && !membersLoaded) loadMembers(1);
		if (activeTab === "requests" && canMng && !requestsLoaded) loadRequests();
		if (activeTab === "posts" && !postsLoaded) loadPosts(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTab, group]);

	async function handleJoin() {
		const needApproval = group.requiresApproval;
		setBusy(true);
		if (needApproval) setPending(true);
		else setGroup((g) => ({ ...g, isMember: true, member: true, memberCount: (g.memberCount ?? 0) + 1 }));
		try {
			await api.post(endpoints.group.join(groupId));
			toast.success(needApproval ? "Đã gửi yêu cầu tham gia, chờ phê duyệt." : "Đã tham gia nhóm.");
			if (!needApproval && membersLoaded) loadMembers(1);
		} catch (e) {
			if (needApproval) setPending(false);
			else
				setGroup((g) => ({
					...g,
					isMember: false,
					member: false,
					memberCount: Math.max(0, (g.memberCount ?? 1) - 1),
				}));
			toast.error(e.message || "Không tham gia được nhóm.");
		} finally {
			setBusy(false);
		}
	}

	async function handleLeave() {
		setBusy(true);
		setGroup((g) => ({
			...g,
			isMember: false,
			member: false,
			memberCount: Math.max(0, (g.memberCount ?? 1) - 1),
		}));
		try {
			await api.post(endpoints.group.leave(groupId));
			toast.success("Đã rời nhóm.");
			if (membersLoaded) loadMembers(1);
		} catch (e) {
			setGroup((g) => ({ ...g, isMember: true, member: true, memberCount: (g.memberCount ?? 0) + 1 }));
			toast.error(e.message || "Không rời được nhóm.");
		} finally {
			setBusy(false);
		}
	}

	async function handleProcess(request, approve) {
		setRequestBusyId(request.id);
		// endpoints.js chưa có route "process"; ghép từ base group (đúng route backend).
		const url = `${endpoints.group.byId(groupId)}/join-requests/${request.id}/process`;
		try {
			await api.post(url, { approve });
			setRequests((list) => list.filter((r) => r.id !== request.id));
			setGroup((g) =>
				g
					? {
							...g,
							memberCount: approve ? (g.memberCount ?? 0) + 1 : g.memberCount,
							pendingRequestCount: Math.max(0, (g.pendingRequestCount ?? 1) - 1),
						}
					: g,
			);
			if (approve && membersLoaded) loadMembers(1);
			toast.success(approve ? "Đã duyệt yêu cầu." : "Đã từ chối yêu cầu.");
		} catch (e) {
			toast.error(e.message || "Không xử lý được yêu cầu.");
		} finally {
			setRequestBusyId(null);
		}
	}

	if (loading) return <DetailSkeleton />;

	if (error || !group) {
		return (
			<div className="mx-auto max-w-2xl">
				<EmptyState
					icon={UsersThree}
					title="Không mở được nhóm"
					description={error?.message || "Nhóm không tồn tại hoặc bạn không có quyền xem."}
					action={
						<Button variant="primary" onClick={() => navigate("/groups")}>
							Về danh sách nhóm
						</Button>
					}
				/>
			</div>
		);
	}

	const owner = isOwner(group, userId);
	const member = isMemberOf(group);
	const privacy = privacyMeta(group.privacy);
	const PrivacyIcon = privacy.Icon;

	const tabs = [
		{ key: "members", label: "Thành viên", icon: Users },
		...(canMng
			? [{ key: "requests", label: "Yêu cầu tham gia", icon: UserPlus, badge: group.pendingRequestCount }]
			: []),
		{ key: "posts", label: "Bài viết", icon: Article },
	];

	return (
		<div className="mx-auto max-w-3xl">
			<Link
				to="/groups"
				className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-brand-600 dark:hover:text-brand-400"
			>
				<ArrowLeft size={16} /> Nhóm
			</Link>

			{/* Header */}
			<Card className="overflow-hidden">
				<div className="relative h-40 w-full bg-zinc-100 dark:bg-zinc-800 sm:h-52">
					<img src={coverUrl(group, 1200, 400)} alt="" className="h-full w-full object-cover" />
					<span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-zinc-950/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
						<PrivacyIcon size={14} weight="bold" />
						{privacy.label}
					</span>
				</div>

				<div className="p-5">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex items-end gap-4">
							<Avatar
								src={group.avatarUrl}
								name={group.name}
								size="xl"
								ring
								className="-mt-16 border-2 border-white dark:border-zinc-900"
							/>
							<div className="min-w-0">
								<h1 className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
									{group.name}
								</h1>
								<p className="mt-0.5 text-sm text-zinc-500">
									<span className="font-mono">{memberCountLabel(group.memberCount)}</span>
									{group.ownerName && (
										<>
											{" · "}
											Tạo bởi{" "}
											<Link
												to={`/profile/${group.ownerId}`}
												className="font-medium text-zinc-600 hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
											>
												{group.ownerName}
											</Link>
										</>
									)}
								</p>
							</div>
						</div>

						<div className="shrink-0">
							{owner ? (
								<span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
									<Crown size={16} weight="fill" /> Chủ nhóm
								</span>
							) : member ? (
								<Button variant="outline" loading={busy} onClick={handleLeave}>
									<SignOut size={18} /> Rời nhóm
								</Button>
							) : pending ? (
								<Button variant="secondary" disabled>
									<Clock size={18} /> Đã gửi yêu cầu
								</Button>
							) : (
								<Button variant="primary" loading={busy} onClick={handleJoin}>
									<UserPlus size={18} /> Tham gia
								</Button>
							)}
						</div>
					</div>

					{group.description && (
						<p className="mt-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
							{group.description}
						</p>
					)}
				</div>
			</Card>

			{/* Tabs */}
			<div className="sticky top-16 z-20 mt-5 flex gap-1 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
				{tabs.map((t) => {
					const TabIcon = t.icon;
					const active = activeTab === t.key;
					return (
						<button
							key={t.key}
							onClick={() => setActiveTab(t.key)}
							className={cn(
								"relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
								active
									? "text-brand-600 dark:text-brand-400"
									: "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
							)}
						>
							<TabIcon size={18} weight={active ? "fill" : "regular"} />
							{t.label}
							{t.badge > 0 && (
								<span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
									{t.badge}
								</span>
							)}
							{active && (
								<motion.span
									layoutId={reduce ? undefined : "group-tab"}
									className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500"
								/>
							)}
						</button>
					);
				})}
			</div>

			<div className="mt-5">
				{activeTab === "members" && (
					<TabMembers
						loading={membersLoading}
						members={members}
						ownerId={group.ownerId}
						hasMore={membersPage < membersTotalPages}
						loadingMore={membersMore}
						onMore={() => loadMembers(membersPage + 1)}
					/>
				)}

				{activeTab === "requests" && canMng && (
					<TabRequests
						loading={requestsLoading}
						requests={requests}
						busyId={requestBusyId}
						onApprove={(r) => handleProcess(r, true)}
						onReject={(r) => handleProcess(r, false)}
					/>
				)}

				{activeTab === "posts" && (
					<TabPosts
						loading={postsLoading}
						posts={posts}
						hasMore={postsPage < postsTotalPages}
						loadingMore={postsMore}
						onMore={() => loadPosts(postsPage + 1)}
					/>
				)}
			</div>
		</div>
	);
}

function TabMembers({ loading, members, ownerId, hasMore, loadingMore, onMore }) {
	if (loading)
		return (
			<Card>
				<RowsSkeleton count={6} />
			</Card>
		);
	if (members.length === 0)
		return <EmptyState icon={Users} title="Chưa có thành viên" description="Nhóm này chưa có ai." />;
	return (
		<Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
			{members.map((m) => (
				<MemberRow key={m.id ?? m.userId} member={m} ownerId={ownerId} />
			))}
			{hasMore && (
				<div className="p-3">
					<Button variant="ghost" size="sm" loading={loadingMore} onClick={onMore} className="w-full">
						Xem thêm
					</Button>
				</div>
			)}
		</Card>
	);
}

function TabRequests({ loading, requests, busyId, onApprove, onReject }) {
	if (loading)
		return (
			<Card>
				<RowsSkeleton count={4} />
			</Card>
		);
	if (requests.length === 0)
		return (
			<EmptyState
				icon={UserPlus}
				title="Không có yêu cầu nào"
				description="Chưa có ai xin tham gia nhóm."
			/>
		);
	return (
		<Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
			{requests.map((r) => (
				<JoinRequestRow
					key={r.id}
					request={r}
					busy={busyId === r.id}
					onApprove={() => onApprove(r)}
					onReject={() => onReject(r)}
				/>
			))}
		</Card>
	);
}

function TabPosts({ loading, posts, hasMore, loadingMore, onMore }) {
	if (loading)
		return (
			<div className="space-y-4">
				{Array.from({ length: 2 }).map((_, i) => (
					<Card key={i} className="p-4">
						<div className="flex items-center gap-3">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="flex-1">
								<Skeleton className="h-3.5 w-1/3" />
								<Skeleton className="mt-2 h-3 w-1/4" />
							</div>
						</div>
						<Skeleton className="mt-3 h-3 w-full" />
						<Skeleton className="mt-2 h-3 w-4/5" />
					</Card>
				))}
			</div>
		);
	if (posts.length === 0)
		return (
			<EmptyState icon={Article} title="Chưa có bài viết" description="Nhóm này chưa có bài đăng nào." />
		);
	return (
		<div className="space-y-4">
			{posts.map((p) => (
				<GroupPostCard key={p.id} post={p} />
			))}
			{hasMore && (
				<Button variant="ghost" loading={loadingMore} onClick={onMore} className="w-full">
					Xem thêm bài viết
				</Button>
			)}
		</div>
	);
}

function DetailSkeleton() {
	return (
		<div className="mx-auto max-w-3xl">
			<Skeleton className="mb-4 h-4 w-16" />
			<Card className="overflow-hidden">
				<Skeleton className="h-40 w-full rounded-none sm:h-52" />
				<div className="p-5">
					<div className="flex items-end gap-4">
						<Skeleton className="-mt-16 h-24 w-24 rounded-full" />
						<div className="flex-1">
							<Skeleton className="h-6 w-1/2" />
							<Skeleton className="mt-2 h-3 w-1/3" />
						</div>
					</div>
					<Skeleton className="mt-4 h-3 w-full" />
					<Skeleton className="mt-2 h-3 w-2/3" />
				</div>
			</Card>
		</div>
	);
}
