import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	ArrowClockwise,
	MagnifyingGlass,
	PaperPlaneTilt,
	Prohibit,
	Sparkle,
	UserPlus,
	Users,
	WarningCircle,
	X,
} from "@phosphor-icons/react";
import { Button, EmptyState, Modal, Skeleton, Tabs, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { displayName } from "../../lib/format";
import UserCard from "./components/UserCard";

// Tabs. `countKey` maps to a field of the social counts endpoint; suggested has
// no server-side count so its badge falls back to the loaded list length.
const TABS = [
	{ key: "friends", label: "Bạn bè", icon: Users, countKey: "friendsCount" },
	{
		key: "received",
		label: "Lời mời",
		icon: UserPlus,
		countKey: "pendingFriendRequestsCount",
	},
	{
		key: "sent",
		label: "Đã gửi",
		icon: PaperPlaneTilt,
		countKey: "sentFriendRequestsCount",
	},
	{ key: "suggested", label: "Gợi ý", icon: Sparkle, countKey: null },
	{ key: "blocked", label: "Đã chặn", icon: Prohibit, countKey: "blockedUsersCount" },
];

const TAB_TITLE = {
	friends: "Bạn bè",
	received: "Lời mời kết bạn",
	sent: "Lời mời đã gửi",
	suggested: "Gợi ý cho bạn",
	blocked: "Đã chặn",
};

// The person on the "other end" of a relationship row. Blocks track blockedId;
// friendships/requests store the pair as (userId, friendId) so we pick whichever
// is not the current user.
function otherUserId(tab, row, me) {
	if (tab === "blocked") return row.blockedId;
	return row.userId === me ? row.friendId : row.userId;
}

// Fetch profiles for a set of user ids, tolerating per-item failures.
async function enrichProfiles(ids) {
	const unique = [...new Set(ids.filter(Boolean))];
	const settled = await Promise.allSettled(
		unique.map((id) => api.get(endpoints.profile.byId(id))),
	);
	const map = new Map();
	unique.forEach((id, i) => {
		if (settled[i].status === "fulfilled") map.set(id, settled[i].value);
	});
	return map;
}

// Which tab list an action mutates (for optimistic removal + count bumps).
const REMOVES_FROM = {
	accept: "received",
	reject: "received",
	cancel: "sent",
	unblock: "blocked",
	removeFriend: "friends",
	addFriend: "suggested",
};

export default function FriendsPage() {
	const { userId: me } = useAuth();
	const toast = useToast();
	const reduce = useReducedMotion();

	const [activeTab, setActiveTab] = useState("friends");
	const [counts, setCounts] = useState(null);
	const [dataByTab, setDataByTab] = useState({}); // key -> { status, items, error }
	const [confirmRemove, setConfirmRemove] = useState(null); // friends item pending confirm
	const [removing, setRemoving] = useState(false);
	const [query, setQuery] = useState("");

	// Load one tab's list (+ profile enrichment for id-only responses).
	const loadTab = useCallback(
		async (tab) => {
			setDataByTab((prev) => ({
				...prev,
				[tab]: { status: "loading", items: prev[tab]?.items ?? [] },
			}));
			try {
				let items = [];
				if (tab === "suggested") {
					const list = await api.get(endpoints.social.suggested);
					items = (list ?? []).map((p) => ({
						id: p.userId,
						userId: p.userId,
						profile: p,
					}));
				} else {
					const url = {
						friends: endpoints.social.friends,
						received: endpoints.social.receivedRequests,
						sent: endpoints.social.sentRequests,
						blocked: endpoints.social.blocks,
					}[tab];
					const page = await api.get(url);
					const rows = page?.content ?? [];
					const base = rows.map((r) => ({
						id: r.id,
						userId: otherUserId(tab, r, me),
					}));
					const profiles = await enrichProfiles(base.map((b) => b.userId));
					items = base.map((b) => ({ ...b, profile: profiles.get(b.userId) ?? null }));
				}
				setDataByTab((prev) => ({ ...prev, [tab]: { status: "success", items } }));
			} catch (e) {
				setDataByTab((prev) => ({
					...prev,
					[tab]: { status: "error", items: [], error: e.message },
				}));
				toast.error(e.message || "Không tải được danh sách.");
			}
		},
		[me, toast],
	);

	// Global counts (badges). Best-effort: badges just hide if this fails.
	useEffect(() => {
		api
			.get(endpoints.social.counts)
			.then(setCounts)
			.catch(() => {});
	}, []);

	// Lazy-load each tab the first time it becomes active.
	useEffect(() => {
		if (!dataByTab[activeTab]) loadTab(activeTab);
	}, [activeTab, dataByTab, loadTab]);

	function removeItem(tab, id) {
		setDataByTab((prev) => {
			const entry = prev[tab];
			if (!entry) return prev;
			return { ...prev, [tab]: { ...entry, items: entry.items.filter((it) => it.id !== id) } };
		});
	}

	function bumpCount(key, delta) {
		if (!key) return;
		setCounts((c) => (c ? { ...c, [key]: Math.max(0, (c[key] ?? 0) + delta) } : c));
	}

	// Invalidate a cached tab so it refetches next time it is opened.
	function invalidate(tab) {
		setDataByTab((prev) => {
			if (!prev[tab]) return prev;
			const next = { ...prev };
			delete next[tab];
			return next;
		});
	}

	// Runs a relationship mutation, then applies the optimistic UI update.
	// Throws on failure so the calling button can reset its loading state.
	const onAction = useCallback(
		async (type, item) => {
			const uid = item.userId;
			try {
				switch (type) {
					case "accept":
						await api.post(endpoints.social.acceptFriend(uid));
						removeItem("received", item.id);
						bumpCount("pendingFriendRequestsCount", -1);
						bumpCount("friendsCount", 1);
						invalidate("friends");
						toast.success("Đã chấp nhận lời mời kết bạn.");
						break;
					case "reject":
						await api.post(endpoints.social.rejectFriend(uid));
						removeItem("received", item.id);
						bumpCount("pendingFriendRequestsCount", -1);
						toast.success("Đã từ chối lời mời.");
						break;
					case "cancel":
						await api.delete(endpoints.social.cancelRequest(uid));
						removeItem("sent", item.id);
						bumpCount("sentFriendRequestsCount", -1);
						toast.success("Đã thu hồi lời mời kết bạn.");
						break;
					case "unblock":
						await api.delete(endpoints.social.unblock(uid));
						removeItem("blocked", item.id);
						bumpCount("blockedUsersCount", -1);
						toast.success("Đã bỏ chặn người dùng.");
						break;
					case "removeFriend":
						await api.delete(endpoints.social.removeFriend(uid));
						removeItem("friends", item.id);
						bumpCount("friendsCount", -1);
						toast.success("Đã huỷ kết bạn.");
						break;
					case "addFriend":
						await api.post(endpoints.social.sendFriendRequest(uid));
						removeItem("suggested", item.id);
						bumpCount("sentFriendRequestsCount", 1);
						invalidate("sent");
						toast.success("Đã gửi lời mời kết bạn.");
						break;
					case "follow":
						await api.post(endpoints.social.follow(uid));
						toast.success("Đã theo dõi.");
						break;
					case "unfollow":
						await api.delete(endpoints.social.unfollow(uid));
						toast.success("Đã bỏ theo dõi.");
						break;
					default:
						break;
				}
			} catch (e) {
				toast.error(e.message || "Thao tác thất bại, thử lại sau.");
				throw e;
			}
		},
		[toast],
	);

	async function doRemoveFriend() {
		if (!confirmRemove) return;
		setRemoving(true);
		try {
			await onAction("removeFriend", confirmRemove);
			setConfirmRemove(null);
		} catch {
			// Keep the modal open; the error toast already fired.
		} finally {
			setRemoving(false);
		}
	}

	function badgeFor(tab) {
		if (tab.key === "suggested") {
			const d = dataByTab.suggested;
			return d?.status === "success" ? d.items.length : null;
		}
		return counts ? counts[tab.countKey] : null;
	}

	const current = dataByTab[activeTab] ?? { status: "loading", items: [] };

	// Client-side filter over the already-loaded tab; no extra network call.
	const visibleItems = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return current.items;
		return current.items.filter((item) => {
			const p = item.profile;
			const haystack = `${p?.username ?? ""} ${displayName(p)}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [current.items, query]);

	return (
		<div className="mx-auto max-w-[935px] px-4 pt-4 md:pt-[30px]">
			{/* Search box */}
			<div className="flex h-10 items-center gap-3 rounded-lg bg-fill px-4">
				<MagnifyingGlass size={16} className="shrink-0 text-muted" />
				<input
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Tìm kiếm"
					className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
				/>
				{query && (
					<button
						type="button"
						onClick={() => setQuery("")}
						aria-label="Xoá tìm kiếm"
						className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-fill-strong text-canvas"
					>
						<X size={10} weight="bold" />
					</button>
				)}
			</div>

			{/* Same uppercase strip as profile and groups. Blue pills read as buttons,
			    not as navigation, and Instagram never uses them for tabs. Counts ride
			    inside the label so <Tabs> stays a plain {key,label,icon} contract. */}
			<Tabs
				className="mt-4"
				value={activeTab}
				onChange={setActiveTab}
				items={TABS.map((tab) => {
					const badge = badgeFor(tab);
					return {
						key: tab.key,
						icon: tab.icon,
						label: (
							<>
								{tab.label}
								{badge > 0 && (
									<span className="ml-1 text-muted">{badge}</span>
								)}
							</>
						),
					};
				})}
			/>

			{/* Panel: re-mounts per tab for a subtle enter transition */}
			<motion.div
				key={activeTab}
				initial={reduce ? false : { opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
			>
				<h2 className="py-3 text-sm font-semibold text-muted">{TAB_TITLE[activeTab]}</h2>

				{current.status === "loading" && <RowSkeletonList />}

				{current.status === "error" && (
					<EmptyState
						icon={WarningCircle}
						title="Không tải được"
						description={current.error || "Đã có lỗi xảy ra khi tải danh sách."}
						action={
							<Button
								variant="secondary"
								size="sm"
								onClick={() => loadTab(activeTab)}
							>
								<ArrowClockwise size={16} weight="bold" />
								Thử lại
							</Button>
						}
					/>
				)}

				{current.status === "success" && current.items.length === 0 && (
					<EmptyForTab tab={activeTab} onExplore={() => setActiveTab("suggested")} />
				)}

				{current.status === "success" && current.items.length > 0 && visibleItems.length === 0 && (
					<EmptyState
						icon={MagnifyingGlass}
						title="Không tìm thấy kết quả"
						description="Thử tìm kiếm với từ khoá khác."
					/>
				)}

				{current.status === "success" && visibleItems.length > 0 && (
					<div>
						<AnimatePresence mode="popLayout" initial={false}>
							{visibleItems.map((item) => (
								<UserCard
									key={item.id}
									item={item}
									tab={activeTab}
									onAction={onAction}
									onConfirmRemoveFriend={setConfirmRemove}
								/>
							))}
						</AnimatePresence>
					</div>
				)}
			</motion.div>

			{/* Confirm: huỷ kết bạn */}
			<ConfirmRemoveModal
				item={confirmRemove}
				loading={removing}
				onClose={() => setConfirmRemove(null)}
				onConfirm={doRemoveFriend}
			/>
		</div>
	);
}

// --- Sub-pieces kept in-file (only used here) ---

function RowSkeleton() {
	return (
		<div className="flex items-center gap-3 py-2">
			<Skeleton className="h-11 w-11 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-2">
				<Skeleton className="h-3.5 w-32" />
				<Skeleton className="h-3 w-20" />
			</div>
			<Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
		</div>
	);
}

function RowSkeletonList() {
	return (
		<div>
			{Array.from({ length: 6 }).map((_, i) => (
				<RowSkeleton key={i} />
			))}
		</div>
	);
}

const EMPTY = {
	friends: {
		icon: Users,
		title: "Chưa có bạn bè",
		description: "Khám phá gợi ý để kết nối với những người bạn có thể biết.",
	},
	received: {
		icon: UserPlus,
		title: "Không có lời mời nào",
		description: "Khi ai đó gửi lời mời kết bạn, lời mời sẽ hiện ở đây.",
	},
	sent: {
		icon: PaperPlaneTilt,
		title: "Chưa gửi lời mời nào",
		description: "Những lời mời kết bạn bạn đã gửi sẽ xuất hiện ở đây.",
	},
	suggested: {
		icon: Sparkle,
		title: "Chưa có gợi ý",
		description: "Kết bạn thêm để chúng tôi gợi ý những người bạn có thể biết.",
	},
	blocked: {
		icon: Prohibit,
		title: "Chưa chặn ai",
		description: "Danh sách người dùng bạn đã chặn sẽ hiển thị tại đây.",
	},
};

function EmptyForTab({ tab, onExplore }) {
	const cfg = EMPTY[tab];
	return (
		<EmptyState
			icon={cfg.icon}
			title={cfg.title}
			description={cfg.description}
			action={
				tab === "friends" ? (
					<Button variant="primary" size="sm" onClick={onExplore}>
						<Sparkle size={16} weight="fill" />
						Xem gợi ý
					</Button>
				) : null
			}
		/>
	);
}

function ConfirmRemoveModal({ item, loading, onClose, onConfirm }) {
	const name = item ? displayName(item.profile) : "";
	return (
		<Modal open={!!item} onClose={onClose} title="Huỷ kết bạn" size="sm">
			<p className="text-sm text-muted">
				Bạn có chắc muốn huỷ kết bạn với{" "}
				<span className="font-semibold text-ink">{name}</span>? Hai người sẽ không còn là bạn bè
				của nhau.
			</p>
			<div className="mt-5 flex justify-end gap-2">
				<Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
					Đóng
				</Button>
				<Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>
					Huỷ kết bạn
				</Button>
			</div>
		</Modal>
	);
}
