import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { isThisWeek, isToday } from "date-fns";
import { ArrowClockwise, Heart } from "@phosphor-icons/react";
import { Button, EmptyState, Spinner, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import NotificationItem, { targetFor } from "./components/NotificationItem";
import NotificationSkeleton from "./components/NotificationSkeleton";

const PAGE_SIZE = 20;

const FILTERS = [
	{ key: "all", label: "Tất cả" },
	{ key: "unread", label: "Chưa đọc" },
];

// Nhóm theo mốc thời gian kiểu Instagram. Backend luôn set createdAt (Instant,
// không null) và trả danh sách đã sắp createdAt giảm dần
// (NotificationService#getNotifications dùng Sort.by("createdAt").descending()),
// nên chỉ cần gom các mục liền kề cùng nhãn theo đúng thứ tự, không cần sắp lại.
function groupLabel(createdAt) {
	if (!createdAt) return "Trước đó";
	const d = new Date(createdAt);
	if (isToday(d)) return "Hôm nay";
	if (isThisWeek(d, { weekStartsOn: 1 })) return "Tuần này";
	return "Trước đó";
}

function groupByTime(list) {
	const groups = [];
	for (const n of list) {
		const label = groupLabel(n.createdAt);
		const last = groups[groups.length - 1];
		if (last && last.label === label) {
			last.items.push(n);
		} else {
			groups.push({ label, items: [n] });
		}
	}
	return groups;
}

export default function NotificationsPage() {
	const toast = useToast();
	const navigate = useNavigate();

	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [hasNext, setHasNext] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [filter, setFilter] = useState("all");

	const [loading, setLoading] = useState(true); // initial load
	const [loadingMore, setLoadingMore] = useState(false);
	const [markingAll, setMarkingAll] = useState(false);
	const [error, setError] = useState(false);

	// Refresh the unread badge from the source of truth (server count).
	const refreshUnread = useCallback(async () => {
		try {
			const count = await api.get(endpoints.notification.unreadCount);
			setUnreadCount(Number(count) || 0);
		} catch {
			// Non-critical: the badge just stays as-is.
		}
	}, []);

	// Load the first page (used on mount + retry).
	const loadFirst = useCallback(async () => {
		setLoading(true);
		setError(false);
		try {
			const res = await api.get(endpoints.notification.list, {
				params: { page: 1, size: PAGE_SIZE },
			});
			setItems(res?.content ?? []);
			setPage(1);
			setHasNext(Boolean(res?.hasNext));
		} catch (e) {
			setError(true);
			toast.error(e.message || "Không tải được thông báo.");
		} finally {
			setLoading(false);
		}
	}, [toast]);

	const loadMore = useCallback(async () => {
		if (loadingMore || loading || !hasNext) return;
		setLoadingMore(true);
		try {
			const next = page + 1;
			const res = await api.get(endpoints.notification.list, {
				params: { page: next, size: PAGE_SIZE },
			});
			setItems((prev) => [...prev, ...(res?.content ?? [])]);
			setPage(next);
			setHasNext(Boolean(res?.hasNext));
		} catch (e) {
			toast.error(e.message || "Không tải thêm được.");
		} finally {
			setLoadingMore(false);
		}
	}, [hasNext, loading, loadingMore, page, toast]);

	useEffect(() => {
		loadFirst();
		refreshUnread();
	}, [loadFirst, refreshUnread]);

	// Infinite scroll: observe a sentinel near the list's end.
	const sentinelRef = useRef(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el || !hasNext) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: "240px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [hasNext, loadMore]);

	// Optimistic single mark-read + best-effort navigation.
	const handleSelect = useCallback(
		(n) => {
			if (!n.isRead) {
				setItems((prev) =>
					prev.map((x) =>
						x.id === n.id
							? { ...x, isRead: true, readAt: new Date().toISOString() }
							: x,
					),
				);
				setUnreadCount((c) => Math.max(0, c - 1));
				api.put(endpoints.notification.markRead(n.id)).catch((e) => {
					// Revert on failure.
					setItems((prev) =>
						prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x)),
					);
					setUnreadCount((c) => c + 1);
					toast.error(e.message || "Không đánh dấu được đã đọc.");
				});
			}
			const target = targetFor(n);
			if (target) navigate(target);
		},
		[navigate, toast],
	);

	// Optimistic mark-all-read.
	const handleMarkAll = useCallback(async () => {
		if (markingAll || unreadCount === 0) return;
		setMarkingAll(true);
		const snapshot = items;
		const nowIso = new Date().toISOString();
		setItems((prev) =>
			prev.map((x) => (x.isRead ? x : { ...x, isRead: true, readAt: nowIso })),
		);
		setUnreadCount(0);
		try {
			await api.put(endpoints.notification.markAllRead);
			toast.success("Đã đánh dấu tất cả là đã đọc.");
		} catch (e) {
			setItems(snapshot);
			await refreshUnread();
			toast.error(e.message || "Không đánh dấu được tất cả.");
		} finally {
			setMarkingAll(false);
		}
	}, [items, markingAll, refreshUnread, toast, unreadCount]);

	const visible = filter === "unread" ? items.filter((n) => !n.isRead) : items;
	const groups = groupByTime(visible);

	return (
		<div className="mx-auto max-w-[500px] px-4 pt-4 md:pt-[30px]">
			<div className="flex items-center justify-between border-b border-line pb-4">
				<h1 className="text-2xl font-bold text-ink">Thông báo</h1>
				<Button
					variant="link"
					size="sm"
					onClick={handleMarkAll}
					loading={markingAll}
					disabled={unreadCount === 0}
				>
					Đánh dấu đã đọc tất cả
				</Button>
			</div>

			<div className="flex items-center gap-2 py-3">
				{FILTERS.map((f) => (
					<Button
						key={f.key}
						variant={filter === f.key ? "primary" : "secondary"}
						size="sm"
						onClick={() => setFilter(f.key)}
					>
						{f.label}
						{f.key === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
					</Button>
				))}
			</div>

			{loading ? (
				<NotificationSkeleton rows={6} />
			) : error ? (
				<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
					<p className="text-sm text-muted">
						Không tải được thông báo. Vui lòng thử lại.
					</p>
					<Button variant="outline" size="sm" onClick={loadFirst}>
						<ArrowClockwise size={16} />
						Thử lại
					</Button>
				</div>
			) : visible.length === 0 ? (
				<EmptyState
					icon={Heart}
					title={
						filter === "unread"
							? "Không có thông báo chưa đọc"
							: "Chưa có hoạt động nào"
					}
					description={
						filter === "unread"
							? "Bạn đã xem hết mọi thông báo."
							: "Khi có hoạt động mới, thông báo sẽ xuất hiện ở đây."
					}
				/>
			) : (
				<>
					{groups.map((g, i) => (
						<div key={`${g.label}-${i}`}>
							<h2 className="py-3 text-base font-semibold text-ink">{g.label}</h2>
							<AnimatePresence initial={false}>
								{g.items.map((n) => (
									<NotificationItem
										key={n.id}
										notification={n}
										onSelect={handleSelect}
									/>
								))}
							</AnimatePresence>
						</div>
					))}

					{hasNext && (
						<div ref={sentinelRef} className="flex items-center justify-center py-4">
							{loadingMore ? (
								<Spinner size={20} className="text-accent" />
							) : (
								<Button variant="ghost" size="sm" onClick={loadMore}>
									Xem thêm
								</Button>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
}
