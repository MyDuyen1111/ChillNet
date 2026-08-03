import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	ArrowClockwise,
	PaperPlaneTilt,
	Prohibit,
	SmileySad,
	Sparkle,
	UserPlus,
	Users,
	WarningCircle,
} from "@phosphor-icons/react";
import { Button, Card, EmptyState, Modal, Skeleton, useToast } from "../../components/ui";
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

	return (
		<div className="mx-auto max-w-5xl px-4 py-6">
			<header className="mb-6">
				<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
					Bạn bè
				</h1>
				<p className="mt-1 text-sm text-zinc-500">
					Quản lý bạn bè, lời mời và những người bạn đã chặn.
				</p>
			</header>

			{/* Tab bar */}
			<div className="mb-6 flex gap-1 overflow-x-auto pb-1">
				{TABS.map((tab) => {
					const active = tab.key === activeTab;
					const Icon = tab.icon;
					const badge = badgeFor(tab);
					return (
						<button
							key={tab.key}
							type="button"
							onClick={() => setActiveTab(tab.key)}
							className={
								"relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors " +
								(active
									? "text-brand-700 dark:text-brand-300"
									: "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
							}
						>
							{active && (
								<motion.span
									layoutId="friendsTabPill"
									transition={{ type: "spring", stiffness: 360, damping: 30 }}
									className="absolute inset-0 rounded-full bg-brand-50 dark:bg-brand-900/40"
								/>
							)}
							<span className="relative z-10 flex items-center gap-1.5">
								<Icon size={16} weight={active ? "fill" : "regular"} />
								{tab.label}
								{badge > 0 && (
									<span
										className={
											"ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-xs " +
											(active
												? "bg-brand-600 text-white"
												: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300")
										}
									>
										{badge}
									</span>
								)}
							</span>
						</button>
					);
				})}
			</div>

			{/* Panel: re-mounts per tab for a subtle enter transition */}
			<motion.div
				key={activeTab}
				initial={reduce ? false : { opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, ease: "easeOut" }}
			>
				{current.status === "loading" && <CardGridSkeleton />}

				{current.status === "error" && (
					<EmptyState
						icon={WarningCircle}
						title="Không tải được"
						description={current.error || "Đã có lỗi xảy ra khi tải danh sách."}
						action={
							<Button
								variant="outline"
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

				{current.status === "success" && current.items.length > 0 && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<AnimatePresence mode="popLayout">
							{current.items.map((item) => (
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

function CardGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<Card key={i} className="flex flex-col items-center gap-4 p-4">
					<Skeleton className="h-14 w-14 rounded-full" />
					<div className="flex w-full flex-col items-center gap-1.5">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-16" />
					</div>
					<Skeleton className="h-9 w-full rounded-xl" />
				</Card>
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
		icon: SmileySad,
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
			<p className="text-sm text-zinc-600 dark:text-zinc-300">
				Bạn có chắc muốn huỷ kết bạn với{" "}
				<span className="font-semibold text-zinc-900 dark:text-zinc-100">{name}</span>? Hai
				người sẽ không còn là bạn bè của nhau.
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
