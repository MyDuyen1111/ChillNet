import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass, Plus, Crown, UsersThree, Compass } from "@phosphor-icons/react";
import { Button, Tabs, EmptyState, useToast } from "../../components/ui";
import api, { toFormData } from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { pageItems } from "./groupUtils";
import GroupCard from "./components/GroupCard";
import CreateGroupModal from "./components/CreateGroupModal";
import { GroupGridSkeleton } from "./components/GroupSkeletons";

// Trang Nhóm ánh xạ theo trang Khám phá của Instagram: ô tìm kiếm + dải tab +
// lưới ô vuông. "Nhóm của tôi" / "Đã tham gia" / "Khám phá" giờ là 3 tab thay
// vì 3 khối xếp chồng như trước.
const TABS = [
	{ key: "mine", label: "Nhóm của tôi", icon: Crown },
	{ key: "joined", label: "Đã tham gia", icon: UsersThree },
	{ key: "discover", label: "Khám phá", icon: Compass },
];

export default function GroupsPage() {
	const { userId } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();

	const [tab, setTab] = useState("discover");
	const [query, setQuery] = useState("");
	const [myGroups, setMyGroups] = useState([]);
	const [joinedGroups, setJoinedGroups] = useState([]);
	const [discover, setDiscover] = useState([]);
	const [loadingMine, setLoadingMine] = useState(true);
	const [loadingJoined, setLoadingJoined] = useState(true);
	const [loadingDiscover, setLoadingDiscover] = useState(true);
	const [createOpen, setCreateOpen] = useState(false);
	const [creating, setCreating] = useState(false);

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
			loadMine();
		} catch (e) {
			toast.error(e.message || "Không tạo được nhóm.");
			throw e;
		} finally {
			setCreating(false);
		}
	}

	const items = tab === "mine" ? myGroups : tab === "joined" ? joinedGroups : discover;
	const loading = tab === "mine" ? loadingMine : tab === "joined" ? loadingJoined : loadingDiscover;

	const emptyTitle =
		tab === "mine"
			? "Bạn chưa tạo nhóm nào"
			: tab === "joined"
				? "Bạn chưa tham gia nhóm nào"
				: query
					? "Không tìm thấy nhóm nào"
					: "Chưa có nhóm để khám phá";
	const emptyDescription =
		tab === "mine"
			? 'Nhấn "Tạo nhóm" để bắt đầu xây dựng cộng đồng của riêng bạn.'
			: tab === "joined"
				? "Tham gia một nhóm để kết nối với cộng đồng cùng sở thích."
				: query
					? "Thử từ khoá khác, hoặc tạo nhóm mới với chủ đề này."
					: "Hãy là người đầu tiên tạo một cộng đồng.";

	return (
		<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-xl font-semibold text-ink">Nhóm</h1>
				<Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
					<Plus size={16} weight="bold" /> Tạo nhóm
				</Button>
			</div>

			<div className="mt-4 flex h-10 items-center gap-3 rounded-lg bg-fill px-4">
				<MagnifyingGlass size={16} className="text-muted" />
				<input
					type="text"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setTab("discover");
					}}
					placeholder="Tìm nhóm theo tên..."
					className="h-full flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
				/>
			</div>

			<div className="mt-6">
				<Tabs items={TABS} value={tab} onChange={setTab} />
			</div>

			<div className="py-6">
				{loading ? (
					<GroupGridSkeleton count={6} />
				) : items.length === 0 ? (
					<EmptyState icon={UsersThree} title={emptyTitle} description={emptyDescription} />
				) : (
					<div className="grid grid-cols-2 gap-1 md:grid-cols-3">
						{items.map((g) => (
							<GroupCard key={g.id} group={g} />
						))}
					</div>
				)}
			</div>

			<CreateGroupModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreate={handleCreate}
				submitting={creating}
			/>
		</div>
	);
}
