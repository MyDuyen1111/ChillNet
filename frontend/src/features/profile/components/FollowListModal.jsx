import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Modal, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import { fetchProfiles } from "../../../lib/profiles";
import { displayName } from "../../../lib/format";

const PAGE_SIZE = 20;

// Danh sách người theo dõi / đang theo dõi.
//
// GET /follows/{followers,following}/{userId} trả PageResponse<FollowResponse>,
// mà FollowResponse chỉ có { id, followerId, followingId } — không có tên hay
// avatar. `pick` chọn ra đầu nào là "người kia" tuỳ theo đang xem danh sách nào,
// rồi hồ sơ được lấy thêm ở bước sau.
export default function FollowListModal({ open, onClose, title, url, direction }) {
	const toast = useToast();
	const [rows, setRows] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);

	const pick = useCallback(
		(row) => (direction === "followers" ? row.followerId : row.followingId),
		[direction],
	);

	const load = useCallback(
		async (nextPage) => {
			setLoading(true);
			try {
				const res = await api.get(url, { params: { page: nextPage, size: PAGE_SIZE } });
				const list = res?.content ?? res?.data ?? [];
				const ids = list.map(pick).filter(Boolean);
				const profiles = await fetchProfiles(ids);
				const mapped = list.map((row) => ({
					key: row.id ?? pick(row),
					userId: pick(row),
					profile: profiles.get(pick(row)) ?? null,
				}));
				setTotalPages(res?.totalPages ?? 1);
				setPage(nextPage);
				setRows((prev) => (nextPage === 1 ? mapped : [...prev, ...mapped]));
			} catch (err) {
				toast.error(err?.message || "Không tải được danh sách.");
			} finally {
				setLoading(false);
			}
		},
		[url, pick, toast],
	);

	useEffect(() => {
		if (!open) return;
		setRows([]);
		setPage(1);
		load(1);
	}, [open, load]);

	return (
		<Modal open={open} onClose={onClose} title={title} size="sm">
			<div className="max-h-[60vh] overflow-y-auto">
				{loading && rows.length === 0 ? (
					<div className="space-y-3 py-2">
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-11 w-11 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-3.5 w-32" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
						))}
					</div>
				) : rows.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted">Chưa có ai ở đây.</p>
				) : (
					<div className="divide-y divide-line">
						{rows.map((row) => {
							const name = displayName(row.profile);
							return (
								<Link
									key={row.key}
									to={`/profile/${row.userId}`}
									onClick={onClose}
									className="flex items-center gap-3 py-2.5"
								>
									<Avatar src={row.profile?.avatar} name={name} size="md" />
									<span className="min-w-0">
										<span className="block truncate text-sm font-semibold text-ink">
											{row.profile?.username || name || "Người dùng"}
										</span>
										{row.profile?.username && name !== row.profile.username && (
											<span className="block truncate text-xs text-muted">{name}</span>
										)}
									</span>
								</Link>
							);
						})}
					</div>
				)}

				{page < totalPages && (
					<div className="flex justify-center pt-3">
						<Button variant="secondary" size="sm" loading={loading} onClick={() => load(page + 1)}>
							Xem thêm
						</Button>
					</div>
				)}
			</div>
		</Modal>
	);
}
