import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	ArrowLeft,
	Flag,
	Gear,
	Plus,
	ImageSquare,
	X,
	SquaresFour,
	Users,
	UserPlus,
	UsersThree,
} from "@phosphor-icons/react";
import {
	Button,
	IconButton,
	Avatar,
	Tabs,
	EmptyState,
	Skeleton,
	Modal,
	Textarea,
	useToast,
} from "../../components/ui";
import api, { http, toFormData } from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import {
	pageItems,
	pageTotalPages,
	isMemberOf,
	isOwner,
	isGroupAdmin,
	canManage,
	privacyMeta,
} from "./groupUtils";
import MemberRow from "./components/MemberRow";
import EditGroupModal from "./components/EditGroupModal";
import AddMemberModal from "./components/AddMemberModal";
import JoinRequestRow from "./components/JoinRequestRow";
import GroupPostCard from "./components/GroupPostCard";
import { RowsSkeleton, PostGridSkeleton } from "./components/GroupSkeletons";
import ReportModal from "../moderation/ReportModal";

// Trang chi tiết nhóm ánh xạ theo trang hồ sơ Instagram: avatar + tên + nút
// hành động, hàng chỉ số (bài viết / thành viên), mô tả, rồi dải tab.
export default function GroupDetailPage() {
	const { groupId } = useParams();
	const { userId } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();

	const [group, setGroup] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [activeTab, setActiveTab] = useState("posts");
	const [busy, setBusy] = useState(false);
	const [pending, setPending] = useState(false);
	const [postCount, setPostCount] = useState(null);
	const [composeOpen, setComposeOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [savingGroup, setSavingGroup] = useState(false);
	const [deletingGroup, setDeletingGroup] = useState(false);
	const [addMemberOpen, setAddMemberOpen] = useState(false);

	// Thành viên
	const [members, setMembers] = useState([]);
	const [membersLoading, setMembersLoading] = useState(false);
	const [membersLoaded, setMembersLoaded] = useState(false);
	const [membersPage, setMembersPage] = useState(1);
	const [membersTotalPages, setMembersTotalPages] = useState(1);
	const [membersMore, setMembersMore] = useState(false);
	const [memberBusyId, setMemberBusyId] = useState(null);

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
		setActiveTab("posts");
		setMembers([]);
		setMembersLoaded(false);
		setRequests([]);
		setRequestsLoaded(false);
		setPosts([]);
		setPostsLoaded(false);
		setPostCount(null);
		api
			.get(endpoints.group.byId(groupId))
			.then((g) => alive && setGroup(g))
			.catch((e) => alive && setError(e))
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [groupId]);

	// Đếm nhanh số bài viết (size=1, chỉ lấy totalElements) để hiện ở hàng chỉ số
	// ngay cả khi tab "Bài viết" chưa được mở.
	useEffect(() => {
		if (!groupId) return;
		let alive = true;
		api
			.get(endpoints.post.byGroup(groupId), { params: { page: 1, size: 1 } })
			.then((r) => alive && setPostCount(r?.totalElements ?? 0))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [groupId]);

	const canMng = canManage(group, userId);
	const isGroupOwner = isOwner(group, userId);
	const isAdmin = isGroupAdmin(group, userId);

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
			const r = await api.get(endpoints.post.byGroup(groupId), { params: { page, size: 12 } });
			const items = pageItems(r);
			setPosts((prev) => (page === 1 ? items : [...prev, ...items]));
			setPostsPage(page);
			setPostsTotalPages(pageTotalPages(r));
			setPostsLoaded(true);
			if (page === 1 && typeof r?.totalElements === "number") setPostCount(r.totalElements);
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
		if (activeTab === "posts" && !postsLoaded) loadPosts(1);
		if (activeTab === "members" && !membersLoaded) loadMembers(1);
		if (activeTab === "requests" && canMng && !requestsLoaded) loadRequests();
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
		try {
			await api.post(endpoints.group.processJoinRequest(groupId, request.id), { approve });
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

	async function handleRemoveMember(member) {
		const mid = member.userId ?? member.id;
		setMemberBusyId(mid);
		try {
			await api.delete(endpoints.group.member(groupId, member.userId));
			setMembers((list) => list.filter((m) => (m.userId ?? m.id) !== mid));
			setGroup((g) => (g ? { ...g, memberCount: Math.max(0, (g.memberCount ?? 1) - 1) } : g));
			toast.success("Đã xoá thành viên khỏi nhóm.");
		} catch (e) {
			toast.error(e.message || "Không xoá được thành viên.");
		} finally {
			setMemberBusyId(null);
		}
	}

	// UpdateGroupRequest không mang ảnh; hai ảnh có endpoint multipart riêng nên
	// phải gọi tuần tự sau khi lưu phần JSON, giống hệt luồng tạo nhóm.
	async function handleSaveGroup({ payload, coverFile, avatarFile }) {
		setSavingGroup(true);
		try {
			let updated = await api.put(endpoints.group.update(groupId), payload);
			const mp = { headers: { "Content-Type": "multipart/form-data" } };
			if (coverFile) {
				try {
					updated = await api.put(endpoints.group.cover(groupId), toFormData({ file: coverFile }), mp);
				} catch {
					toast.error("Đã lưu nhóm nhưng tải ảnh bìa thất bại.");
				}
			}
			if (avatarFile) {
				try {
					updated = await api.put(endpoints.group.avatar(groupId), toFormData({ file: avatarFile }), mp);
				} catch {
					toast.error("Đã lưu nhóm nhưng tải ảnh đại diện thất bại.");
				}
			}
			// Response của endpoint ảnh không kèm cờ isMember/memberRole, nên trộn
			// vào nhóm đang có thay vì thay thế — nếu không nút "Đã tham gia" sẽ
			// nhảy về "Tham gia" ngay sau khi lưu.
			setGroup((g) => ({ ...g, ...updated }));
			setSettingsOpen(false);
			toast.success("Đã cập nhật nhóm.");
		} catch (e) {
			toast.error(e.message || "Không cập nhật được nhóm.");
			throw e;
		} finally {
			setSavingGroup(false);
		}
	}

	async function handleDeleteGroup() {
		setDeletingGroup(true);
		try {
			await api.delete(endpoints.group.remove(groupId));
			toast.success("Đã xoá nhóm.");
			navigate("/groups", { replace: true });
		} catch (e) {
			toast.error(e.message || "Không xoá được nhóm.");
			setDeletingGroup(false);
		}
	}

	async function handleChangeRole(member, role) {
		const mid = member.userId ?? member.id;
		setMemberBusyId(mid);
		try {
			await api.put(endpoints.group.memberRole(groupId, member.userId), { role });
			setMembers((list) => list.map((m) => ((m.userId ?? m.id) === mid ? { ...m, role } : m)));
			toast.success("Đã đổi vai trò thành viên.");
		} catch (e) {
			toast.error(e.message || "Không đổi được vai trò.");
		} finally {
			setMemberBusyId(null);
		}
	}

	async function handleAddMember(profile) {
		await api.post(endpoints.group.member(groupId, profile.userId));
		setGroup((g) => (g ? { ...g, memberCount: (g.memberCount ?? 0) + 1 } : g));
		if (membersLoaded) loadMembers(1);
	}

	function handlePostCreated(created) {
		if (created) {
			setPosts((prev) => [created, ...prev]);
			setPostCount((c) => (c == null ? 1 : c + 1));
		}
		setComposeOpen(false);
	}

	if (loading) return <DetailSkeleton />;

	if (error || !group) {
		return (
			<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
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

	const member = isMemberOf(group);
	const privacy = privacyMeta(group.privacy);
	const PrivacyIcon = privacy.Icon;
	const canPost = member && group.allowPosting !== false && (!group.onlyAdminCanPost || canMng);

	const tabs = [
		{ key: "posts", label: "Bài viết", icon: SquaresFour },
		{ key: "members", label: "Thành viên", icon: Users },
		...(canMng
			? [
					{
						key: "requests",
						label: group.pendingRequestCount > 0 ? `Yêu cầu (${group.pendingRequestCount})` : "Yêu cầu",
						icon: UserPlus,
					},
				]
			: []),
	];

	return (
		<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
			<Link to="/groups" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
				<ArrowLeft size={16} /> Nhóm
			</Link>

			<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
				<div className="flex justify-center sm:block sm:shrink-0">
					<Avatar src={group.avatarUrl} name={group.name} size="xl" className="sm:hidden" />
					<Avatar src={group.avatarUrl} name={group.name} size="2xl" className="hidden sm:flex" />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
						<h1 className="flex items-center gap-2 truncate text-xl font-normal text-ink">
							{group.name}
							<PrivacyIcon size={16} className="shrink-0 text-muted" />
						</h1>

						{canMng ? (
							<IconButton
								label={isGroupOwner ? "Cài đặt nhóm" : "Quản lý nhóm"}
								onClick={() =>
									isGroupOwner ? setSettingsOpen(true) : setActiveTab("requests")
								}
							>
								<Gear size={22} />
							</IconButton>
						) : member ? (
							<Button variant="secondary" size="md" loading={busy} onClick={handleLeave}>
								Đã tham gia
							</Button>
						) : pending ? (
							<Button variant="secondary" size="md" disabled>
								Đã gửi yêu cầu
							</Button>
						) : (
							<Button variant="primary" size="md" loading={busy} onClick={handleJoin}>
								Tham gia
							</Button>
						)}

						{/* moderation-service nhận TargetType.GROUP và tra chủ nhóm qua
						    /internal/groups/{id}, nhưng trước đây không có lối vào nào
						    trên giao diện — chỉ bài viết và bình luận báo cáo được. */}
						{group.ownerId !== userId && (
							<IconButton label="Báo cáo nhóm" onClick={() => setReportOpen(true)}>
								<Flag size={20} />
							</IconButton>
						)}
					</div>

					<div className="mt-4 flex justify-center gap-10 text-base text-ink sm:justify-start">
						<span>
							<span className="font-semibold">
								{postCount != null ? postCount.toLocaleString("vi-VN") : "…"}
							</span>{" "}
							bài viết
						</span>
						<span>
							<span className="font-semibold">{Number(group.memberCount ?? 0).toLocaleString("vi-VN")}</span> thành
							viên
						</span>
					</div>

					{group.ownerName && (
						<p className="mt-3 text-center text-sm text-muted sm:text-left">
							Tạo bởi{" "}
							<Link to={`/profile/${group.ownerId}`} className="font-semibold text-ink hover:text-muted">
								{group.ownerName}
							</Link>
						</p>
					)}

					{group.description && (
						<p className="mt-3 whitespace-pre-wrap text-center text-sm text-ink sm:text-left">
							{group.description}
						</p>
					)}
				</div>
			</div>

			<div className="mt-8">
				<Tabs items={tabs} value={activeTab} onChange={setActiveTab} />
			</div>

			<div className="py-6">
				{activeTab === "posts" && (
					<TabPosts
						loading={postsLoading}
						posts={posts}
						hasMore={postsPage < postsTotalPages}
						loadingMore={postsMore}
						onMore={() => loadPosts(postsPage + 1)}
						canPost={canPost}
						onCompose={() => setComposeOpen(true)}
					/>
				)}

				{activeTab === "members" && (
					<TabMembers
						loading={membersLoading}
						members={members}
						ownerId={group.ownerId}
						canManage={canMng}
						canChangeRole={isAdmin}
						currentUserId={userId}
						busyId={memberBusyId}
						onRemove={handleRemoveMember}
						onChangeRole={handleChangeRole}
						onAddMember={() => setAddMemberOpen(true)}
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
			</div>

			<CreatePostModal
				open={composeOpen}
				onClose={() => setComposeOpen(false)}
				groupId={groupId}
				onCreated={handlePostCreated}
			/>

			<ReportModal
				open={reportOpen}
				onClose={() => setReportOpen(false)}
				targetType="GROUP"
				targetId={groupId}
				targetLabel="nhóm này"
			/>

			{isGroupOwner && (
				<EditGroupModal
					open={settingsOpen}
					group={group}
					onClose={() => setSettingsOpen(false)}
					onSave={handleSaveGroup}
					onDelete={handleDeleteGroup}
					submitting={savingGroup}
					deleting={deletingGroup}
				/>
			)}

			<AddMemberModal
				open={addMemberOpen}
				onClose={() => setAddMemberOpen(false)}
				onAdd={handleAddMember}
				existingIds={members.map((m) => m.userId).filter(Boolean)}
			/>
		</div>
	);
}

function TabPosts({ loading, posts, hasMore, loadingMore, onMore, canPost, onCompose }) {
	return (
		<div>
			{canPost && (
				<div className="mb-4 flex justify-end">
					<Button variant="primary" size="md" onClick={onCompose}>
						<Plus size={16} weight="bold" /> Tạo bài viết
					</Button>
				</div>
			)}

			{loading ? (
				<PostGridSkeleton />
			) : posts.length === 0 ? (
				<EmptyState icon={SquaresFour} title="Chưa có bài viết" description="Nhóm này chưa có bài đăng nào." />
			) : (
				<>
					<div className="grid grid-cols-3 gap-1">
						{posts.map((p) => (
							<GroupPostCard key={p.id} post={p} />
						))}
					</div>
					{hasMore && (
						<div className="mt-4 flex justify-center">
							<Button variant="secondary" size="sm" loading={loadingMore} onClick={onMore}>
								Xem thêm
							</Button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

function TabMembers({
	loading,
	members,
	ownerId,
	canManage,
	canChangeRole,
	currentUserId,
	busyId,
	onRemove,
	onChangeRole,
	onAddMember,
	hasMore,
	loadingMore,
	onMore,
}) {
	if (loading) return <RowsSkeleton count={6} />;
	return (
		<div>
			{canManage && (
				<div className="mb-4 flex justify-end">
					<Button variant="secondary" size="md" onClick={onAddMember}>
						<UserPlus size={16} weight="bold" /> Thêm thành viên
					</Button>
				</div>
			)}

			{members.length === 0 ? (
				<EmptyState icon={Users} title="Chưa có thành viên" description="Nhóm này chưa có ai." />
			) : (
			<div className="divide-y divide-line-soft">
				{members.map((m) => (
					<MemberRow
						key={m.id ?? m.userId}
						member={m}
						ownerId={ownerId}
						canManage={canManage}
						canChangeRole={canChangeRole}
						currentUserId={currentUserId}
						busy={busyId === (m.userId ?? m.id)}
						onRemove={() => onRemove(m)}
						onChangeRole={onChangeRole}
					/>
				))}
			</div>
			)}
			{hasMore && (
				<div className="flex justify-center pt-4">
					<Button variant="secondary" size="sm" loading={loadingMore} onClick={onMore}>
						Xem thêm
					</Button>
				</div>
			)}
		</div>
	);
}

function TabRequests({ loading, requests, busyId, onApprove, onReject }) {
	if (loading) return <RowsSkeleton count={4} />;
	if (requests.length === 0)
		return (
			<EmptyState icon={UserPlus} title="Không có yêu cầu nào" description="Chưa có ai xin tham gia nhóm." />
		);
	return (
		<div className="divide-y divide-line-soft">
			{requests.map((r) => (
				<JoinRequestRow
					key={r.id}
					request={r}
					busy={busyId === r.id}
					onApprove={() => onApprove(r)}
					onReject={() => onReject(r)}
				/>
			))}
		</div>
	);
}

const MAX_COMPOSE_IMAGES = 4;

// Modal soạn bài viết trong nhóm. group-service PostRequest hỗ trợ sẵn field
// `groupId` (post-service PostController /create) nên tái dùng thẳng endpoint
// tạo bài viết chung, chỉ thêm groupId vào form.
function CreatePostModal({ open, onClose, groupId, onCreated }) {
	const toast = useToast();
	const fileRef = useRef(null);
	const [content, setContent] = useState("");
	const [attachments, setAttachments] = useState([]);
	const [submitting, setSubmitting] = useState(false);

	function pickFiles(e) {
		const chosen = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
		e.target.value = "";
		if (!chosen.length) return;
		const room = MAX_COMPOSE_IMAGES - attachments.length;
		const next = chosen.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
		setAttachments((prev) => [...prev, ...next]);
	}

	function removeAt(i) {
		setAttachments((prev) => {
			URL.revokeObjectURL(prev[i]?.url);
			return prev.filter((_, idx) => idx !== i);
		});
	}

	function reset() {
		attachments.forEach((a) => URL.revokeObjectURL(a.url));
		setContent("");
		setAttachments([]);
	}

	function handleClose() {
		if (submitting) return;
		reset();
		onClose();
	}

	async function submit(e) {
		e.preventDefault();
		if (!content.trim() && attachments.length === 0) return;
		setSubmitting(true);
		try {
			const form = toFormData({
				content: content.trim(),
				images: attachments.map((a) => a.file),
				groupId,
			});
			const res = await http.post(endpoints.post.create, form, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			toast.success("Đã đăng bài viết.");
			onCreated(res.data?.result);
			reset();
		} catch (err) {
			toast.error(err.message || "Không đăng được bài viết.");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Modal open={open} onClose={handleClose} title="Tạo bài viết mới">
			<form onSubmit={submit} className="space-y-4">
				<Textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					rows={4}
					placeholder="Bạn đang nghĩ gì?"
					autoFocus
				/>

				{attachments.length > 0 && (
					<div className="grid grid-cols-4 gap-2">
						{attachments.map((a, i) => (
							<div key={a.url} className="group relative aspect-square overflow-hidden rounded">
								<img src={a.url} alt="" className="h-full w-full object-cover" />
								<button
									type="button"
									onClick={() => removeAt(i)}
									aria-label="Gỡ ảnh"
									className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
								>
									<X size={12} />
								</button>
							</div>
						))}
					</div>
				)}

				<div className="flex items-center justify-between border-t border-line pt-3">
					<input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickFiles} />
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => fileRef.current?.click()}
						disabled={attachments.length >= MAX_COMPOSE_IMAGES}
					>
						<ImageSquare size={18} /> Ảnh
					</Button>
					<Button
						type="submit"
						variant="primary"
						size="md"
						loading={submitting}
						disabled={!content.trim() && attachments.length === 0}
					>
						Đăng
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function DetailSkeleton() {
	return (
		<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
			<Skeleton className="mb-4 h-4 w-16" />
			<div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
				<Skeleton className="h-[88px] w-[88px] shrink-0 rounded-full sm:h-[150px] sm:w-[150px]" />
				<div className="w-full flex-1 space-y-3">
					<Skeleton className="mx-auto h-6 w-48 sm:mx-0" />
					<Skeleton className="mx-auto h-4 w-40 sm:mx-0" />
					<Skeleton className="mx-auto h-4 w-64 sm:mx-0" />
				</div>
			</div>
			<div className="mt-8 border-t border-line" />
			<div className="py-6">
				<PostGridSkeleton />
			</div>
		</div>
	);
}
