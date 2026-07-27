import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { ArrowClockwise, Bell, Checks } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Spinner, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { cn } from "../../lib/cn";
import NotificationItem, { targetFor } from "./components/NotificationItem";
import NotificationSkeleton from "./components/NotificationSkeleton";

const PAGE_SIZE = 20;

const FILTERS = [
	{ key: "all", label: "Tất cả" },
	{ key: "unread", label: "Chưa đọc" },
];

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

	const visible =
		filter === "unread" ? items.filter((n) => !n.isRead) : items;

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
			<header className="mb-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
							Thông báo
						</h1>
						<p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
							{unreadCount > 0
								? `${unreadCount} thông báo chưa đọc`
								: "Bạn đã xem hết thông báo"}
						</p>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleMarkAll}
						loading={markingAll}
						disabled={unreadCount === 0}
						className="shrink-0"
					>
						<Checks size={18} />
						<span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
						<span className="sm:hidden">Đã đọc hết</span>
					</Button>
				</div>

				<div className="mt-4 inline-flex gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
					{FILTERS.map((f) => {
						const active = filter === f.key;
						return (
							<button
								key={f.key}
								type="button"
								onClick={() => setFilter(f.key)}
								className={cn(
									"inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
									active
										? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
										: "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
								)}
							>
								{f.label}
								{f.key === "unread" && unreadCount > 0 && (
									<span
										className={cn(
											"min-w-5 rounded-full px-1.5 text-center font-mono text-xs leading-5",
											active
												? "bg-white/20 text-white"
												: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
										)}
									>
										{unreadCount}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</header>

			<Card className="overflow-hidden">
				{loading ? (
					<NotificationSkeleton rows={6} />
				) : error ? (
					<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
						<p className="text-sm text-zinc-500 dark:text-zinc-400">
							Không tải được thông báo. Vui lòng thử lại.
						</p>
						<Button variant="outline" size="sm" onClick={loadFirst}>
							<ArrowClockwise size={16} />
							Thử lại
						</Button>
					</div>
				) : visible.length === 0 ? (
					<EmptyState
						icon={Bell}
						title={
							filter === "unread"
								? "Không có thông báo chưa đọc"
								: "Chưa có thông báo"
						}
						description={
							filter === "unread"
								? "Bạn đã đọc hết mọi thông báo."
								: "Khi có hoạt động mới, thông báo sẽ xuất hiện ở đây."
						}
					/>
				) : (
					<>
						<div className="divide-y divide-zinc-100 dark:divide-zinc-800">
							<AnimatePresence initial={false}>
								{visible.map((n) => (
									<NotificationItem
										key={n.id}
										notification={n}
										onSelect={handleSelect}
									/>
								))}
							</AnimatePresence>
						</div>

						{hasNext && (
							<div
								ref={sentinelRef}
								className="flex items-center justify-center border-t border-zinc-100 py-4 dark:border-zinc-800"
							>
								{loadingMore ? (
									<Spinner size={20} className="text-brand-500" />
								) : (
									<Button variant="ghost" size="sm" onClick={loadMore}>
										Xem thêm
									</Button>
								)}
							</div>
						)}
					</>
				)}
			</Card>
		</div>
	);
}
