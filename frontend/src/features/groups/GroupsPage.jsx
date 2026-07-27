import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus, Crown, UsersThree, Compass } from "@phosphor-icons/react";
import { Button, Input, EmptyState } from "../../components/ui";
import api, { toFormData } from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { pageItems } from "./groupUtils";
import GroupCard from "./components/GroupCard";
import CreateGroupModal from "./components/CreateGroupModal";
import { GroupGridSkeleton } from "./components/GroupSkeletons";
import { useToast } from "../../components/ui";

export default function GroupsPage() {
	const { userId } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();

	const [query, setQuery] = useState("");
	const [myGroups, setMyGroups] = useState([]);
	const [joinedGroups, setJoinedGroups] = useState([]);
	const [discover, setDiscover] = useState([]);
	const [loadingMine, setLoadingMine] = useState(true);
	const [loadingJoined, setLoadingJoined] = useState(true);
	const [loadingDiscover, setLoadingDiscover] = useState(true);
	const [createOpen, setCreateOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [busyId, setBusyId] = useState(null);
	const [pendingIds, setPendingIds] = useState(() => new Set());

	const loadMine = useCallback(() => {
		setLoadingMine(true);
		return api
			.get(endpoints.group.myGroups, { params: { page: 1, size: 12 } })
			.then((r) => setMyGroups(pageItems(r)))
			.catch((e) => toast.error(e.message || "Không tải được nhóm của bạn."))
			.finally(() => setLoadingMine(false));
	}, [toast]);

	const loadJoined = useCallback(() => {
		setLoadingJoined(true);
		return api
			.get(endpoints.group.joinedGroups, { params: { page: 1, size: 12 } })
			// Nhóm mình sở hữu cũng nằm trong "đã tham gia" (owner là member) -> loại ra.
			.then((r) => setJoinedGroups(pageItems(r).filter((g) => g.ownerId !== userId)))
			.catch((e) => toast.error(e.message || "Không tải được nhóm đã tham gia."))
			.finally(() => setLoadingJoined(false));
	}, [toast, userId]);

	const loadDiscover = useCallback(
		(keyword) => {
			setLoadingDiscover(true);
			const kw = keyword?.trim();
			const url = kw ? endpoints.group.search : endpoints.group.groups;
			const params = kw ? { keyword: kw, page: 1, size: 18 } : { page: 1, size: 18 };
			return api
				.get(url, { params })
				.then((r) => setDiscover(pageItems(r)))
				.catch((e) => toast.error(e.message || "Không tải được danh sách nhóm."))
				.finally(() => setLoadingDiscover(false));
		},
		[toast],
	);

	useEffect(() => {
		loadMine();
		loadJoined();
	}, [loadMine, loadJoined]);

	useEffect(() => {
		const id = setTimeout(() => loadDiscover(query), query ? 350 : 0);
		return () => clearTimeout(id);
	}, [query, loadDiscover]);

	const patchAll = useCallback((id, updater) => {
		const apply = (list) => list.map((g) => (g.id === id ? updater(g) : g));
		setMyGroups(apply);
		setJoinedGroups(apply);
		setDiscover(apply);
	}, []);

	const join = (g) => ({ ...g, isMember: true, member: true, memberCount: (g.memberCount ?? 0) + 1 });
	const leave = (g) => ({
		...g,
		isMember: false,
		member: false,
		memberCount: Math.max(0, (g.memberCount ?? 1) - 1),
	});

	async function handleJoin(group) {
		const needApproval = group.requiresApproval;
		setBusyId(group.id);
		if (needApproval) setPendingIds((s) => new Set(s).add(group.id));
		else patchAll(group.id, join);
		try {
			await api.post(endpoints.group.join(group.id));
			toast.success(
				needApproval ? "Đã gửi yêu cầu tham gia, chờ phê duyệt." : "Đã tham gia nhóm.",
			);
		} catch (e) {
			if (needApproval)
				setPendingIds((s) => {
					const n = new Set(s);
					n.delete(group.id);
					return n;
				});
			else patchAll(group.id, leave);
			toast.error(e.message || "Không tham gia được nhóm.");
		} finally {
			setBusyId(null);
		}
	}

	async function handleLeave(group) {
		setBusyId(group.id);
		const prevJoined = joinedGroups;
		patchAll(group.id, leave);
		setJoinedGroups((list) => list.filter((g) => g.id !== group.id));
		try {
			await api.post(endpoints.group.leave(group.id));
			toast.success("Đã rời nhóm.");
		} catch (e) {
			patchAll(group.id, join);
			setJoinedGroups(prevJoined);
			toast.error(e.message || "Không rời được nhóm.");
		} finally {
			setBusyId(null);
		}
	}

	async function handleCreate({ payload, coverFile, avatarFile }) {
		setCreating(true);
		try {
			const created = await api.post(endpoints.group.groups, payload);
			const id = created?.id;
			const mp = { headers: { "Content-Type": "multipart/form-data" } };
			if (id && coverFile) {
				try {
					await api.put(endpoints.group.cover(id), toFormData({ file: coverFile }), mp);
				} catch {
					toast.error("Tạo nhóm xong nhưng tải ảnh bìa thất bại.");
				}
			}
			if (id && avatarFile) {
				try {
					await api.put(endpoints.group.avatar(id), toFormData({ file: avatarFile }), mp);
				} catch {
					toast.error("Tạo nhóm xong nhưng tải ảnh đại diện thất bại.");
				}
			}
			toast.success("Đã tạo nhóm.");
			setCreateOpen(false);
			if (id) navigate(`/groups/${id}`);
		} catch (e) {
			toast.error(e.message || "Không tạo được nhóm.");
			throw e;
		} finally {
			setCreating(false);
		}
	}

	const buildCardProps = (g) => ({
		currentUserId: userId,
		pending: pendingIds.has(g.id),
		busy: busyId === g.id,
		onJoin: () => handleJoin(g),
		onLeave: () => handleLeave(g),
	});

	return (
		<div className="mx-auto max-w-6xl space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nhóm</h1>
					<p className="mt-1 text-sm text-zinc-500">
						Tìm cộng đồng hợp gu hoặc tạo nhóm của riêng bạn.
					</p>
				</div>
				<Button variant="primary" onClick={() => setCreateOpen(true)} className="shrink-0">
					<Plus size={18} weight="bold" /> Tạo nhóm
				</Button>
			</div>

			<div className="max-w-xl">
				<Input
					placeholder="Tìm nhóm theo tên..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					leftIcon={<MagnifyingGlass size={18} />}
				/>
			</div>

			{!query && (
				<>
					<GroupsSection
						icon={Crown}
						title="Nhóm của tôi"
						count={loadingMine ? null : myGroups.length}
						loading={loadingMine}
						items={myGroups}
						buildCardProps={buildCardProps}
						empty={
							<p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
								Bạn chưa tạo nhóm nào. Nhấn "Tạo nhóm" để bắt đầu.
							</p>
						}
					/>

					<GroupsSection
						icon={UsersThree}
						title="Đã tham gia"
						count={loadingJoined ? null : joinedGroups.length}
						loading={loadingJoined}
						items={joinedGroups}
						buildCardProps={buildCardProps}
						empty={
							<p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
								Bạn chưa tham gia nhóm nào.
							</p>
						}
					/>
				</>
			)}

			<GroupsSection
				icon={Compass}
				title={query ? `Kết quả cho "${query}"` : "Khám phá"}
				count={loadingDiscover ? null : discover.length}
				loading={loadingDiscover}
				items={discover}
				buildCardProps={buildCardProps}
				empty={
					<EmptyState
						icon={MagnifyingGlass}
						title={query ? "Không tìm thấy nhóm nào" : "Chưa có nhóm để khám phá"}
						description={
							query
								? "Thử từ khoá khác, hoặc tạo nhóm mới với chủ đề này."
								: "Hãy là người đầu tiên tạo một cộng đồng."
						}
					/>
				}
			/>

			<CreateGroupModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreate={handleCreate}
				submitting={creating}
			/>
		</div>
	);
}

// Section wrapper truyền props hành động theo từng thẻ.
function GroupsSection({ icon: Icon, title, count, loading, items, empty, buildCardProps }) {
	return (
		<section className="space-y-3">
			<div className="flex items-center gap-2">
				<Icon size={20} className="text-brand-600 dark:text-brand-400" weight="fill" />
				<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
				{count != null && (
					<span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500 dark:bg-zinc-800">
						{count}
					</span>
				)}
			</div>
			{loading ? (
				<GroupGridSkeleton count={3} />
			) : items.length === 0 ? (
				empty
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((g) => (
						<GroupCard key={g.id} group={g} {...buildCardProps(g)} />
					))}
				</div>
			)}
		</section>
	);
}
