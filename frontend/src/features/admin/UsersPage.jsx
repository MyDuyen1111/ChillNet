import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowClockwise,
	ArrowLeft,
	MagnifyingGlass,
	Prohibit,
	SealCheck,
	UserGear,
	UsersThree,
	WarningCircle,
} from "@phosphor-icons/react";
import { Button, Card, EmptyState, Input, Modal, Spinner, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { cn } from "../../lib/cn";
import { useAuth } from "../../lib/auth";
import Badge from "../moderation/components/Badge";

// GET /users trả về TOÀN BỘ tài khoản trong một lượt — identity-service không
// phân trang endpoint này. Vì vậy tìm kiếm, lọc và cắt trang đều nằm ở client,
// và số hàng dựng ra DOM phải được chặn lại: một hệ thống vài nghìn tài khoản
// sẽ đứng hình nếu render hết.
const PAGE_SIZE = 25;

// Tên vai trò trong DB là "ADMIN" trần (PredefinedRole.ADMIN_ROLE); tiền tố
// "ROLE_" chỉ được JwtService gắn thêm lúc dựng claim `scope` của token. So sánh
// với "ROLE_ADMIN" ở đây sẽ không bao giờ khớp `RoleResponse.name`, và chốt chặn
// tự khoá mình bên dưới sẽ im lặng không bao giờ chạy.
const ADMIN_ROLE = "ADMIN";

function roleNames(user) {
	return (user?.roles || []).map((r) => r?.name).filter(Boolean);
}

function StatCard({ label, value, tone, emphasis }) {
	return (
		<Card className={cn("p-3", emphasis && "border-amber-500/40")}>
			<p className="text-xs text-muted">{label}</p>
			<p className={cn("mt-1 text-2xl font-bold tabular-nums", tone || "text-ink")}>{value ?? 0}</p>
		</Card>
	);
}

/** Hộp thoại sửa vai trò: gửi PUT /users/{id} với đúng một trường `roles`. */
function RoleEditModal({ user, roles, onClose, onSaved }) {
	const toast = useToast();
	const { user: me } = useAuth();
	const [selected, setSelected] = useState(() => new Set(roleNames(user)));
	const [saving, setSaving] = useState(false);

	const toggle = (name) =>
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	// Tự gỡ ROLE_ADMIN của chính mình là tự khoá mình khỏi khu quản trị, mà
	// identity-service không có endpoint nào cho phép tự cấp lại quyền. Chặn ngay
	// tại form còn hơn để phát hiện sau khi đã lỡ lưu.
	const lockingSelfOut =
		me?.id === user.id && roleNames(user).includes(ADMIN_ROLE) && !selected.has(ADMIN_ROLE);

	const onSubmit = async () => {
		setSaving(true);
		try {
			// Chỉ gửi `roles`: UserUpdateRequest là form sửa từng phần, những
			// trường không gửi sẽ được service giữ nguyên.
			const updated = await api.put(endpoints.identity.updateUser(user.id), {
				roles: [...selected],
			});
			toast.success("Đã cập nhật vai trò.");
			onSaved(updated);
		} catch (e) {
			toast.error(e?.message || "Không cập nhật được vai trò.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal open onClose={() => !saving && onClose()} title="Sửa vai trò" size="sm">
			<p className="text-sm text-ink">
				<span className="font-semibold">{user.username}</span>
			</p>
			<p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>

			<div className="mt-4 space-y-1">
				{roles.length === 0 ? (
					<p className="text-sm text-muted">
						Chưa có vai trò nào trong hệ thống. Tạo ở mục Vai trò &amp; quyền.
					</p>
				) : (
					roles.map((role) => {
						const checked = selected.has(role.name);
						return (
							<label
								key={role.name}
								className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover"
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => toggle(role.name)}
									className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
								/>
								<span className="min-w-0">
									<span className="block text-sm font-semibold text-ink">{role.name}</span>
									{role.description && (
										<span className="block text-xs text-muted">{role.description}</span>
									)}
								</span>
							</label>
						);
					})
				)}
			</div>

			{lockingSelfOut && (
				<p className="mt-3 flex items-start gap-2 rounded-lg bg-fill px-3 py-2 text-xs text-like">
					<WarningCircle size={16} className="mt-px shrink-0" />
					Bạn đang gỡ vai trò quản trị của chính mình. Sau khi lưu, bạn sẽ mất quyền vào khu quản
					trị và không có cách nào tự cấp lại.
				</p>
			)}

			<div className="mt-5 flex justify-end gap-2">
				<Button variant="secondary" onClick={onClose} disabled={saving}>
					Huỷ
				</Button>
				<Button onClick={onSubmit} loading={saving} disabled={lockingSelfOut}>
					Lưu vai trò
				</Button>
			</div>
		</Modal>
	);
}

/** Hộp thoại vô hiệu hoá. DELETE /users/{id} chỉ tắt cờ kích hoạt, không xoá gì. */
function DeactivateModal({ user, onClose, onDone }) {
	const toast = useToast();
	const [saving, setSaving] = useState(false);

	const onSubmit = async () => {
		setSaving(true);
		try {
			await api.delete(endpoints.identity.deactivateUser(user.id));
			toast.success("Đã vô hiệu hoá tài khoản.");
			onDone();
		} catch (e) {
			toast.error(e?.message || "Không vô hiệu hoá được tài khoản.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal open onClose={() => !saving && onClose()} title="Vô hiệu hoá tài khoản" size="sm">
			<p className="text-sm text-ink">
				Vô hiệu hoá tài khoản <span className="font-semibold">{user.username}</span>?
			</p>

			<ul className="mt-3 space-y-2 text-xs text-muted">
				<li>· Người dùng sẽ không đăng nhập lại được nữa.</li>
				<li>
					· Không có bài viết, bình luận hay dữ liệu nào bị xoá — endpoint này chỉ tắt cờ kích hoạt
					của tài khoản.
				</li>
				<li>
					· Phiên đang mở vẫn chạy tới khi token hết hạn: cổng chỉ kiểm tra trạng thái kiểm duyệt
					chứ không kiểm tra cờ kích hoạt. Cần cắt truy cập ngay thì dùng khu Kiểm duyệt để khoá
					hoặc cấm tài khoản.
				</li>
				<li>
					· identity-service chưa có API bật lại, nên việc này coi như không hoàn tác được qua giao
					diện.
				</li>
			</ul>

			<div className="mt-5 flex justify-end gap-2">
				<Button variant="secondary" onClick={onClose} disabled={saving}>
					Huỷ
				</Button>
				<Button variant="danger" onClick={onSubmit} loading={saving}>
					Vô hiệu hoá
				</Button>
			</div>
		</Modal>
	);
}

function UserRow({ user, isSelf, deactivated, onEditRoles, onDeactivate }) {
	const names = roleNames(user);

	return (
		<div className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-sm font-semibold text-ink">{user.username}</span>
					{isSelf && <Badge>Bạn</Badge>}
					{user.emailVerified ? (
						<Badge tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
							<SealCheck size={12} weight="fill" className="mr-1" />
							Đã xác minh
						</Badge>
					) : (
						<Badge tone="bg-amber-500/15 text-amber-600 dark:text-amber-400">
							Chưa xác minh email
						</Badge>
					)}
					{deactivated && (
						<Badge tone="bg-red-500/15 text-red-600 dark:text-red-400">Vừa vô hiệu hoá</Badge>
					)}
				</div>

				<p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>

				<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
					{names.length === 0 ? (
						<span className="text-xs text-faint">Không có vai trò nào</span>
					) : (
						names.map((name) => (
							<Badge key={name} tone="bg-fill-strong text-ink">
								{name}
							</Badge>
						))
					)}
				</div>

				<p className="mt-1 truncate text-xs text-faint">Mã {user.id}</p>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<Button variant="secondary" size="sm" onClick={() => onEditRoles(user)}>
					<UserGear size={16} />
					Vai trò
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onDeactivate(user)}
					disabled={isSelf || deactivated}
					title={isSelf ? "Không thể tự vô hiệu hoá tài khoản của mình" : undefined}
				>
					<Prohibit size={16} />
					Vô hiệu hoá
				</Button>
			</div>
		</div>
	);
}

export default function UsersPage() {
	const { user: me } = useAuth();
	const [users, setUsers] = useState([]);
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [query, setQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [visible, setVisible] = useState(PAGE_SIZE);

	const [editing, setEditing] = useState(null);
	const [deactivating, setDeactivating] = useState(null);
	// UserResponse không có trường isActive, nên sau khi vô hiệu hoá backend
	// không có cách nào cho ta biết tài khoản đã tắt. Chỉ đánh dấu được những
	// tài khoản do chính phiên làm việc này tắt; tải lại trang là mất dấu.
	const [deactivated, setDeactivated] = useState(() => new Set());

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			// Hai danh sách luôn đi cùng nhau: bảng cần tên vai trò để lọc, còn hộp
			// thoại sửa vai trò cần đúng danh mục vai trò đang tồn tại.
			const [userList, roleList] = await Promise.all([
				api.get(endpoints.identity.users),
				api.get(endpoints.identity.roles),
			]);
			setUsers(Array.isArray(userList) ? userList : []);
			setRoles(Array.isArray(roleList) ? roleList : []);
		} catch (e) {
			setError(e?.message || "Không tải được danh sách tài khoản.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return users.filter((u) => {
			if (roleFilter && !roleNames(u).includes(roleFilter)) return false;
			if (!q) return true;
			return (
				(u.username || "").toLowerCase().includes(q) ||
				(u.email || "").toLowerCase().includes(q) ||
				(u.id || "").toLowerCase().includes(q)
			);
		});
	}, [users, query, roleFilter]);

	// Đổi bộ lọc thì phải quay về trang đầu, nếu không người dùng đang ở "trang 5"
	// của kết quả cũ sẽ thấy một danh sách ngắn hơn mà không hiểu vì sao.
	useEffect(() => {
		setVisible(PAGE_SIZE);
	}, [query, roleFilter]);

	const shown = filtered.slice(0, visible);
	const verified = useMemo(() => users.filter((u) => u.emailVerified).length, [users]);

	const onSaved = (updated) => {
		if (updated?.id) {
			setUsers((list) => list.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
		}
		setEditing(null);
	};

	const onDeactivated = () => {
		const id = deactivating.id;
		setDeactivated((current) => new Set(current).add(id));
		setDeactivating(null);
	};

	return (
		<div className="mx-auto max-w-[900px] px-4 pb-16 pt-4 md:pt-[30px]">
			<Link
				to="/admin/moderation"
				className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
			>
				<ArrowLeft size={16} />
				Hàng đợi kiểm duyệt
			</Link>

			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
				<div>
					<h1 className="text-2xl font-bold text-ink">Quản lý tài khoản</h1>
					<p className="mt-0.5 text-sm text-muted">
						Toàn bộ tài khoản của identity-service, cùng vai trò đang được gán.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link to="/admin/roles" className="text-sm font-semibold text-accent hover:opacity-70">
						Vai trò &amp; quyền
					</Link>
					<Button variant="secondary" size="sm" onClick={load}>
						<ArrowClockwise size={16} />
						Làm mới
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-3 gap-2 py-4">
				<StatCard label="Tổng tài khoản" value={users.length} />
				<StatCard
					label="Đã xác minh email"
					value={verified}
					tone="text-emerald-600 dark:text-emerald-400"
				/>
				<StatCard
					label="Chưa xác minh"
					value={users.length - verified}
					tone="text-amber-600 dark:text-amber-400"
					emphasis={users.length - verified > 0}
				/>
			</div>

			<div className="space-y-2 pb-4">
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Tìm theo tên đăng nhập, email hoặc mã tài khoản"
					leftIcon={<MagnifyingGlass size={16} />}
					aria-label="Tìm tài khoản"
				/>

				<div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo vai trò">
					<Button
						size="sm"
						variant={roleFilter === "" ? "primary" : "secondary"}
						onClick={() => setRoleFilter("")}
					>
						Mọi vai trò
					</Button>
					{roles.map((role) => (
						<Button
							key={role.name}
							size="sm"
							variant={roleFilter === role.name ? "primary" : "secondary"}
							onClick={() => setRoleFilter(role.name)}
						>
							{role.name}
						</Button>
					))}
				</div>
			</div>

			<Card flush className="overflow-hidden">
				{loading ? (
					<div className="flex justify-center py-16">
						<Spinner size={24} className="text-muted" />
					</div>
				) : error ? (
					<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
						<p className="text-sm text-muted">{error}</p>
						<Button variant="outline" size="sm" onClick={load}>
							<ArrowClockwise size={16} />
							Thử lại
						</Button>
					</div>
				) : filtered.length === 0 ? (
					<EmptyState
						icon={UsersThree}
						title="Không có tài khoản nào"
						description="Không có tài khoản nào khớp bộ lọc hiện tại."
					/>
				) : (
					<>
						{shown.map((u) => (
							<UserRow
								key={u.id}
								user={u}
								isSelf={me?.id === u.id}
								deactivated={deactivated.has(u.id)}
								onEditRoles={setEditing}
								onDeactivate={setDeactivating}
							/>
						))}
						<div className="flex items-center justify-between gap-3 px-4 py-3">
							<span className="text-xs text-muted">
								Hiển thị {shown.length} / {filtered.length} tài khoản
							</span>
							{shown.length < filtered.length && (
								<Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
									Xem thêm
								</Button>
							)}
						</div>
					</>
				)}
			</Card>

			{editing && (
				<RoleEditModal
					key={editing.id}
					user={editing}
					roles={roles}
					onClose={() => setEditing(null)}
					onSaved={onSaved}
				/>
			)}

			{deactivating && (
				<DeactivateModal
					key={deactivating.id}
					user={deactivating}
					onClose={() => setDeactivating(null)}
					onDone={onDeactivated}
				/>
			)}
		</div>
	);
}
