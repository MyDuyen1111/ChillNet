import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Avatar, Button, Modal, Skeleton, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import { displayName } from "../../../lib/format";

// Thêm thành viên trực tiếp (POST /groups/{id}/members/{userId}) — quyền của
// ADMIN/MODERATOR nhóm. Backend nhận userId chứ không nhận tên, nên phải tìm
// người qua profile-service trước; đây cũng là nơi duy nhất trong luồng nhóm
// cần tới /profile/users/search.
const DEBOUNCE_MS = 350;

export default function AddMemberModal({ open, onClose, onAdd, existingIds = [] }) {
	const toast = useToast();
	const [draft, setDraft] = useState("");
	const [keyword, setKeyword] = useState("");
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState(null);
	const [addedIds, setAddedIds] = useState([]);

	useEffect(() => {
		if (!open) {
			setDraft("");
			setKeyword("");
			setResults([]);
			setAddedIds([]);
		}
	}, [open]);

	useEffect(() => {
		const timer = setTimeout(() => setKeyword(draft.trim()), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [draft]);

	useEffect(() => {
		if (!open || !keyword) return setResults([]);
		let alive = true;
		setLoading(true);
		api.post(endpoints.profile.search, { keyword })
			.then((list) => alive && setResults(Array.isArray(list) ? list : []))
			.catch((e) => {
				if (!alive) return;
				setResults([]);
				toast.error(e.message || "Không tìm được người dùng.");
			})
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [open, keyword, toast]);

	const add = async (profile) => {
		setBusyId(profile.userId);
		try {
			await onAdd(profile);
			setAddedIds((prev) => [...prev, profile.userId]);
			toast.success(`Đã thêm ${profile.username || displayName(profile)} vào nhóm.`);
		} catch (e) {
			toast.error(e.message || "Không thêm được thành viên.");
		} finally {
			setBusyId(null);
		}
	};

	return (
		<Modal open={open} onClose={onClose} title="Thêm thành viên" size="sm">
			<div className="relative">
				<MagnifyingGlass
					size={16}
					className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
				/>
				<input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					placeholder="Tìm theo tên đăng nhập hoặc tên..."
					aria-label="Tìm người dùng"
					autoFocus
					className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-muted"
				/>
			</div>

			<div className="mt-3 max-h-[50vh] overflow-y-auto">
				{loading ? (
					<div className="space-y-3 py-2">
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded-full" />
								<Skeleton className="h-3.5 w-32" />
							</div>
						))}
					</div>
				) : !keyword ? (
					<p className="py-8 text-center text-sm text-muted">
						Nhập tên để tìm người bạn muốn thêm.
					</p>
				) : results.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted">Không tìm thấy ai phù hợp.</p>
				) : (
					<div className="divide-y divide-line">
						{results.map((p) => {
							const name = displayName(p);
							const already = existingIds.includes(p.userId) || addedIds.includes(p.userId);
							return (
								<div key={p.userId} className="flex items-center gap-3 py-2.5">
									<Avatar src={p.avatar} name={name} size="md" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-semibold text-ink">
											{p.username || name}
										</span>
										{p.username && name !== p.username && (
											<span className="block truncate text-xs text-muted">{name}</span>
										)}
									</span>
									{already ? (
										<span className="shrink-0 text-xs text-muted">Đã ở trong nhóm</span>
									) : (
										<Button
											variant="link"
											size="sm"
											loading={busyId === p.userId}
											onClick={() => add(p)}
										>
											Thêm
										</Button>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</Modal>
	);
}
