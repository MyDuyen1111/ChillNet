import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
	MagnifyingGlass,
	Note,
	UsersThree,
	User,
	X,
} from "@phosphor-icons/react";
import {
	Avatar,
	Button,
	Card,
	EmptyState,
	Skeleton,
	useToast,
} from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { displayName } from "../../lib/format";
import PostCard from "../feed/components/PostCard";
import ProfilePostCard from "../profile/components/ProfilePostCard";
import GroupCard from "../groups/components/GroupCard";
import { pageItems, pageTotalPages } from "../groups/groupUtils";

// Tìm kiếm toàn cục trên ba dịch vụ. Ba endpoint này đã có từ đầu ở backend
// nhưng chưa từng được gọi: ô "Tìm kiếm" trên thanh điều hướng trước đây chỉ mở
// trang Bạn bè, nơi ô nhập chỉ lọc client-side danh sách đã tải — nghĩa là không
// có cách nào tìm ra một người mình chưa kết bạn.
//
// Lưu ý bất đối xứng giữa các dịch vụ:
//   - profile /users/search  : POST, body {keyword}, trả LIST (không phân trang)
//   - post    /search        : GET, ?keyword&page&size, trả PageResponse
//   - group   /groups/search : GET, ?keyword&page&size, trả PageResponse
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

const TABS = [
	{ key: "people", label: "Mọi người", icon: User },
	{ key: "posts", label: "Bài viết", icon: Note },
	{ key: "groups", label: "Nhóm", icon: UsersThree },
];

// Nhãn quan hệ lấy từ FriendshipService.getFriendshipStatus.
const FRIEND_STATUS_LABEL = {
	ACCEPTED: "Bạn bè",
	SENT: "Đã gửi lời mời",
	RECEIVED: "Đang chờ bạn phản hồi",
};

function RowSkeleton() {
	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<Skeleton className="h-11 w-11 rounded-full" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-3.5 w-32" />
				<Skeleton className="h-3 w-20" />
			</div>
		</div>
	);
}

function PersonRow({ profile, status, onAddFriend }) {
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const name = displayName(profile);
	const effective = sent ? "SENT" : status;
	const label = FRIEND_STATUS_LABEL[effective];

	const add = async () => {
		setBusy(true);
		try {
			await onAddFriend(profile.userId);
			setSent(true);
		} catch {
			// Trang đã hiện toast lỗi.
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
			<Link to={`/profile/${profile.userId}`} className="shrink-0">
				<Avatar src={profile.avatar} name={name} size="md" />
			</Link>
			<Link to={`/profile/${profile.userId}`} className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-ink">
					{profile.username || name}
				</p>
				<p className="truncate text-xs text-muted">
					{profile.username ? name : profile.bio || "Chưa có giới thiệu"}
				</p>
			</Link>
			<div className="shrink-0">
				{label ? (
					<span className="text-xs text-muted">{label}</span>
				) : (
					<Button variant="link" size="sm" loading={busy} onClick={add}>
						Kết bạn
					</Button>
				)}
			</div>
		</div>
	);
}

function PeopleResults({ keyword }) {
	const toast = useToast();
	const [people, setPeople] = useState([]);
	const [statuses, setStatuses] = useState({});
	const [loading, setLoading] = useState(false);
	const reqId = useRef(0);

	useEffect(() => {
		if (!keyword) {
			setPeople([]);
			setStatuses({});
			return;
		}
		const id = ++reqId.current;
		setLoading(true);
		api.post(endpoints.profile.search, { keyword })
			.then(async (list) => {
				if (id !== reqId.current) return;
				const results = Array.isArray(list) ? list : [];
				setPeople(results);
				// Một lượt gọi cho cả trang kết quả thay vì một lượt mỗi người —
				// đây chính là lý do /friendships/batch-status tồn tại.
				const ids = results.map((p) => p.userId).filter(Boolean);
				if (ids.length === 0) return setStatuses({});
				try {
					const res = await api.post(endpoints.social.batchFriendStatus, ids);
					if (id === reqId.current) setStatuses(res?.statuses ?? {});
				} catch {
					if (id === reqId.current) setStatuses({});
				}
			})
			.catch((err) => {
				if (id !== reqId.current) return;
				setPeople([]);
				toast.error(err.message || "Không tìm được người dùng.");
			})
			.finally(() => {
				if (id === reqId.current) setLoading(false);
			});
	}, [keyword, toast]);

	const addFriend = useCallback(
		async (userId) => {
			try {
				await api.post(endpoints.social.sendFriendRequest(userId));
				toast.success("Đã gửi lời mời kết bạn.");
			} catch (err) {
				toast.error(err.message || "Không gửi được lời mời.");
				throw err;
			}
		},
		[toast],
	);

	if (loading && people.length === 0) {
		return (
			<>
				<RowSkeleton />
				<RowSkeleton />
				<RowSkeleton />
			</>
		);
	}

	if (people.length === 0) {
		return (
			<EmptyState
				icon={User}
				title="Không tìm thấy người dùng"
				description="Thử tìm theo tên đăng nhập, họ hoặc tên."
			/>
		);
	}

	return people.map((p) => (
		<PersonRow
			key={p.userId || p.id}
			profile={p}
			status={statuses[p.userId]}
			onAddFriend={addFriend}
		/>
	));
}

/**
 * Kết quả có phân trang cho bài viết / nhóm. Hai endpoint trả cùng dạng
 * PageResponse nên chỉ khác cách render một item.
 */
function PagedResults({ url, keyword, renderItem, wrapperClassName, empty, alwaysLoad = false }) {
	const toast = useToast();
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const reqId = useRef(0);

	const load = useCallback(
		async (nextPage) => {
			if (!keyword && !alwaysLoad) {
				setItems([]);
				return;
			}
			const id = ++reqId.current;
			setLoading(true);
			try {
				const res = await api.get(url, {
					// Trang Khám phá dùng lại component này nhưng /post/public
					// không nhận `keyword`, nên chỉ gửi khi thật sự có.
					params: keyword
						? { keyword, page: nextPage, size: PAGE_SIZE }
						: { page: nextPage, size: PAGE_SIZE },
				});
				if (id !== reqId.current) return;
				const list = pageItems(res);
				setTotalPages(pageTotalPages(res));
				setPage(nextPage);
				setItems((prev) => (nextPage === 1 ? list : [...prev, ...list]));
			} catch (err) {
				if (id !== reqId.current) return;
				if (nextPage === 1) setItems([]);
				toast.error(err.message || "Không tải được kết quả.");
			} finally {
				if (id === reqId.current) setLoading(false);
			}
		},
		[url, keyword, alwaysLoad, toast],
	);

	useEffect(() => {
		setItems([]);
		setPage(1);
		load(1);
	}, [load]);

	if (loading && items.length === 0) {
		return (
			<>
				<RowSkeleton />
				<RowSkeleton />
			</>
		);
	}

	if (items.length === 0) {
		return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;
	}

	return (
		<>
			<div className={wrapperClassName}>{items.map(renderItem)}</div>
			{page < totalPages && (
				<div className="flex justify-center py-4">
					<Button variant="secondary" size="sm" loading={loading} onClick={() => load(page + 1)}>
						Xem thêm
					</Button>
				</div>
			)}
		</>
	);
}

export default function SearchPage() {
	const [params, setParams] = useSearchParams();
	const urlQuery = params.get("q") ?? "";
	const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "people";

	const [draft, setDraft] = useState(urlQuery);
	const [keyword, setKeyword] = useState(urlQuery.trim());

	// Người dùng gõ liên tục nhưng mỗi lần gõ là một lượt gọi ba dịch vụ, nên
	// chốt từ khoá sau khi ngừng gõ rồi mới ghi vào URL (URL cũng là thứ cho
	// phép chia sẻ / tải lại một trang kết quả).
	useEffect(() => {
		const timer = setTimeout(() => {
			const next = draft.trim();
			setKeyword(next);
			setParams(
				(current) => {
					const p = new URLSearchParams(current);
					next ? p.set("q", next) : p.delete("q");
					return p;
				},
				{ replace: true },
			);
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [draft, setParams]);

	const setTab = (key) =>
		setParams(
			(current) => {
				const p = new URLSearchParams(current);
				p.set("tab", key);
				return p;
			},
			{ replace: true },
		);

	const groupEmpty = useMemo(
		() => ({
			icon: UsersThree,
			title: "Không tìm thấy nhóm",
			description: "Thử một từ khoá khác trong tên hoặc mô tả nhóm.",
		}),
		[],
	);

	const exploreEmpty = useMemo(
		() => ({
			icon: MagnifyingGlass,
			title: "Chưa có gì để khám phá",
			description: "Khi mọi người đăng bài công khai, chúng sẽ xuất hiện ở đây.",
		}),
		[],
	);

	const postEmpty = useMemo(
		() => ({
			icon: Note,
			title: "Không tìm thấy bài viết",
			description: "Tìm kiếm chỉ khớp với nội dung bài viết công khai.",
		}),
		[],
	);

	return (
		<div className="mx-auto max-w-[640px] px-4 pb-16 pt-4 md:pt-[30px]">
			<div className="flex items-baseline justify-between gap-4 pb-4">
				<h1 className="text-2xl font-bold text-ink">Tìm kiếm</h1>
				<Link to="/friends" className="shrink-0 text-sm font-semibold text-accent hover:underline">
					Bạn bè của tôi
				</Link>
			</div>

			<div className="relative">
				<MagnifyingGlass
					size={18}
					className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
				/>
				<input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Tìm người, bài viết hoặc nhóm..."
					aria-label="Từ khoá tìm kiếm"
					autoFocus
					className="h-11 w-full rounded-lg border border-line bg-fill pl-10 pr-10 text-sm text-ink placeholder:text-muted focus:border-muted focus:bg-surface"
				/>
				{draft && (
					<button
						type="button"
						onClick={() => setDraft("")}
						aria-label="Xoá từ khoá"
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
					>
						<X size={16} weight="bold" />
					</button>
				)}
			</div>

			{/* Chưa có từ khoá thì không có gì để lọc — ẩn tab đi cho giống lúc
			    trang chỉ là lưới Khám phá. */}
			<div className={keyword ? "flex gap-1.5 py-4" : "hidden"}>
				{TABS.map((t) => (
					<Button
						key={t.key}
						size="sm"
						variant={tab === t.key ? "primary" : "secondary"}
						onClick={() => setTab(t.key)}
					>
						<t.icon size={14} weight={tab === t.key ? "fill" : "regular"} />
						{t.label}
					</Button>
				))}
			</div>

			{!keyword ? (
				/* Chưa gõ gì thì đây là trang Khám phá: GET /post/public trả các bài
				   công khai ngoài nhóm, đã lọc người bị chặn và nội dung bị kiểm
				   duyệt. Trước đây endpoint này không được gọi ở bất cứ đâu. */
				<>
					<h2 className="py-4 text-sm font-semibold text-ink">Khám phá</h2>
					<PagedResults
						url={endpoints.post.public}
						keyword=""
						alwaysLoad
						wrapperClassName="grid grid-cols-3 gap-1"
						empty={exploreEmpty}
						renderItem={(post) => <ProfilePostCard key={post.id} post={post} />}
					/>
				</>
			) : tab === "people" ? (
				<Card flush className="overflow-hidden">
					<PeopleResults keyword={keyword} />
				</Card>
			) : tab === "posts" ? (
				<PagedResults
					url={endpoints.post.search}
					keyword={keyword}
					wrapperClassName="flex flex-col gap-4"
					empty={postEmpty}
					renderItem={(post) => <PostCard key={post.id} post={post} />}
				/>
			) : (
				<PagedResults
					url={endpoints.group.search}
					keyword={keyword}
					wrapperClassName="grid grid-cols-2 gap-1 sm:grid-cols-3"
					empty={groupEmpty}
					renderItem={(group) => <GroupCard key={group.id} group={group} />}
				/>
			)}
		</div>
	);
}
