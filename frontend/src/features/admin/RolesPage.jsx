import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	ArrowClockwise,
	ArrowLeft,
	Key,
	Plus,
	ShieldStar,
	Trash,
	WarningCircle,
} from "@phosphor-icons/react";
import {
	Button,
	Card,
	EmptyState,
	Input,
	Modal,
	Spinner,
	Tabs,
	useToast,
} from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import Badge from "../moderation/components/Badge";

// Cả vai trò lẫn quyền đều bị bảng nối tham chiếu tới, nên lệnh xoá có thể bị
// ràng buộc khoá ngoại chặn lại — nói trước để người xoá không tưởng là lỗi mạng.
const ROLE_DELETE_NOTE =
	"Những tài khoản đang giữ vai trò này sẽ mất các quyền tương ứng ngay ở lần gọi API kế tiếp. " +
	"Vai trò còn được gán cho tài khoản có thể bị cơ sở dữ liệu từ chối xoá.";

const PERMISSION_DELETE_NOTE =
	"Quyền này sẽ biến mất khỏi mọi vai trò đang tham chiếu tới nó. " +
	"Quyền còn được vai trò sử dụng có thể bị cơ sở dữ liệu từ chối xoá.";

// Vai trò và quyền là hai danh mục của cùng một mô hình phân quyền (vai trò gom
// quyền lại), nên gộp vào một trang hai tab thay vì hai mục điều hướng rời rạc.
const TABS = [
	{ key: "roles", label: "Vai trò", icon: ShieldStar },
	{ key: "permissions", label: "Quyền", icon: Key },
];

/** Hộp thoại xác nhận xoá dùng chung cho cả vai trò lẫn quyền. */
function ConfirmDeleteModal({ title, name, note, onClose, onConfirm }) {
	const [saving, setSaving] = useState(false);

	const run = async () => {
		setSaving(true);
		try {
			await onConfirm();
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal open onClose={() => !saving && onClose()} title={title} size="sm">
			<p className="text-sm text-ink">
				Xoá <span className="font-semibold">{name}</span>?
			</p>
			<p className="mt-2 flex items-start gap-2 text-xs text-muted">
				<WarningCircle size={16} className="mt-px shrink-0" />
				{note}
			</p>
			<div className="mt-5 flex justify-end gap-2">
				<Button variant="secondary" onClick={onClose} disabled={saving}>
					Huỷ
				</Button>
				<Button variant="danger" onClick={run} loading={saving}>
					Xoá
				</Button>
			</div>
		</Modal>
	);
}

function ListShell({ loading, error, empty, onRetry, children }) {
	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<Spinner size={24} className="text-muted" />
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
				<p className="text-sm text-muted">{error}</p>
				<Button variant="outline" size="sm" onClick={onRetry}>
					<ArrowClockwise size={16} />
					Thử lại
				</Button>
			</div>
		);
	}
	if (empty) return empty;
	return children;
}

function RolesTab({ roles, permissions, loading, error, reload }) {
	const toast = useToast();
	const [form, setForm] = useState({ name: "", description: "" });
	const [picked, setPicked] = useState(() => new Set());
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(null);

	const togglePermission = (name) =>
		setPicked((current) => {
			const next = new Set(current);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	const onCreate = async (event) => {
		event.preventDefault();
		const name = form.name.trim();
		if (!name) {
			toast.error("Vui lòng nhập tên vai trò.");
			return;
		}
		setSaving(true);
		try {
			await api.post(endpoints.identity.roles, {
				name,
				description: form.description.trim(),
				permissions: [...picked],
			});
			toast.success("Đã lưu vai trò.");
			setForm({ name: "", description: "" });
			setPicked(new Set());
			await reload();
		} catch (e) {
			toast.error(e?.message || "Không tạo được vai trò.");
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async () => {
		try {
			await api.delete(endpoints.identity.roleByName(removing.name));
			toast.success("Đã xoá vai trò.");
			setRemoving(null);
			await reload();
		} catch (e) {
			toast.error(e?.message || "Không xoá được vai trò.");
		}
	};

	return (
		<div className="space-y-4">
			<Card className="p-4">
				<h2 className="text-sm font-semibold text-ink">Tạo vai trò</h2>
				<form className="mt-3 space-y-3" onSubmit={onCreate}>
					<Input
						label="Tên vai trò"
						value={form.name}
						onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
						placeholder="ROLE_MODERATOR"
						// Tên vai trò là khoá chính ở tầng CSDL, không phải cột tự tăng:
						// lưu trùng tên là ghi đè bản ghi cũ chứ không báo lỗi.
						hint="Tên là khoá chính — trùng tên sẽ ghi đè vai trò đang có."
					/>
					<Input
						label="Mô tả"
						value={form.description}
						onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
						placeholder="Kiểm duyệt viên nội dung"
					/>

					<div>
						<p className="text-sm font-semibold text-ink">Quyền đi kèm</p>
						{permissions.length === 0 ? (
							<p className="mt-1.5 text-xs text-muted">Chưa có quyền nào. Tạo ở tab Quyền trước.</p>
						) : (
							<div className="mt-1.5 flex flex-wrap gap-1.5">
								{permissions.map((p) => {
									const on = picked.has(p.name);
									return (
										<Button
											key={p.name}
											type="button"
											size="sm"
											variant={on ? "primary" : "secondary"}
											onClick={() => togglePermission(p.name)}
											title={p.description || undefined}
										>
											{p.name}
										</Button>
									);
								})}
							</div>
						)}
					</div>

					<div className="flex justify-end">
						<Button type="submit" loading={saving}>
							<Plus size={16} />
							Tạo vai trò
						</Button>
					</div>
				</form>
			</Card>

			<Card flush className="overflow-hidden">
				<ListShell
					loading={loading}
					error={error}
					onRetry={reload}
					empty={
						roles.length === 0 ? (
							<EmptyState
								icon={ShieldStar}
								title="Chưa có vai trò nào"
								description="Tạo vai trò đầu tiên bằng biểu mẫu phía trên."
							/>
						) : null
					}
				>
					{roles.map((role) => (
						<div
							key={role.name}
							className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 last:border-b-0"
						>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-ink">{role.name}</p>
								{role.description && (
									<p className="mt-0.5 text-xs text-muted">{role.description}</p>
								)}
								<div className="mt-1.5 flex flex-wrap gap-1.5">
									{(role.permissions || []).length === 0 ? (
										<span className="text-xs text-faint">Không có quyền nào</span>
									) : (
										(role.permissions || []).map((p) => (
											<Badge key={p.name} tone="bg-fill-strong text-ink">
												{p.name}
											</Badge>
										))
									)}
								</div>
							</div>
							<Button variant="outline" size="sm" onClick={() => setRemoving(role)}>
								<Trash size={16} />
								Xoá
							</Button>
						</div>
					))}
				</ListShell>
			</Card>

			{removing && (
				<ConfirmDeleteModal
					title="Xoá vai trò"
					name={removing.name}
					note={ROLE_DELETE_NOTE}
					onClose={() => setRemoving(null)}
					onConfirm={onDelete}
				/>
			)}
		</div>
	);
}

function PermissionsTab({ permissions, loading, error, reload }) {
	const toast = useToast();
	const [form, setForm] = useState({ name: "", description: "" });
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(null);

	const onCreate = async (event) => {
		event.preventDefault();
		const name = form.name.trim();
		if (!name) {
			toast.error("Vui lòng nhập tên quyền.");
			return;
		}
		setSaving(true);
		try {
			await api.post(endpoints.identity.permissions, {
				name,
				description: form.description.trim(),
			});
			toast.success("Đã lưu quyền.");
			setForm({ name: "", description: "" });
			await reload();
		} catch (e) {
			toast.error(e?.message || "Không tạo được quyền.");
		} finally {
			setSaving(false);
		}
	};

	const onDelete = async () => {
		try {
			await api.delete(endpoints.identity.permissionByName(removing.name));
			toast.success("Đã xoá quyền.");
			setRemoving(null);
			await reload();
		} catch (e) {
			toast.error(e?.message || "Không xoá được quyền.");
		}
	};

	return (
		<div className="space-y-4">
			<Card className="p-4">
				<h2 className="text-sm font-semibold text-ink">Tạo quyền</h2>
				<form className="mt-3 space-y-3" onSubmit={onCreate}>
					<Input
						label="Tên quyền"
						value={form.name}
						onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
						placeholder="POST_DELETE"
						hint="Tên là khoá chính — trùng tên sẽ ghi đè quyền đang có."
					/>
					<Input
						label="Mô tả"
						value={form.description}
						onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
						placeholder="Được phép gỡ bài viết của người khác"
					/>
					<div className="flex justify-end">
						<Button type="submit" loading={saving}>
							<Plus size={16} />
							Tạo quyền
						</Button>
					</div>
				</form>
			</Card>

			<Card flush className="overflow-hidden">
				<ListShell
					loading={loading}
					error={error}
					onRetry={reload}
					empty={
						permissions.length === 0 ? (
							<EmptyState
								icon={Key}
								title="Chưa có quyền nào"
								description="Tạo quyền đầu tiên bằng biểu mẫu phía trên."
							/>
						) : null
					}
				>
					{permissions.map((p) => (
						<div
							key={p.name}
							className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
						>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-ink">{p.name}</p>
								{p.description && <p className="mt-0.5 text-xs text-muted">{p.description}</p>}
							</div>
							<Button variant="outline" size="sm" onClick={() => setRemoving(p)}>
								<Trash size={16} />
								Xoá
							</Button>
						</div>
					))}
				</ListShell>
			</Card>

			{removing && (
				<ConfirmDeleteModal
					title="Xoá quyền"
					name={removing.name}
					note={PERMISSION_DELETE_NOTE}
					onClose={() => setRemoving(null)}
					onConfirm={onDelete}
				/>
			)}
		</div>
	);
}

export default function RolesPage() {
	const [tab, setTab] = useState("roles");
	const [roles, setRoles] = useState([]);
	const [permissions, setPermissions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			// Nạp cả hai danh mục một lượt: biểu mẫu tạo vai trò cần danh sách quyền,
			// nên tách ra chỉ khiến tab Vai trò thiếu dữ liệu cho tới khi đổi tab.
			const [roleList, permissionList] = await Promise.all([
				api.get(endpoints.identity.roles),
				api.get(endpoints.identity.permissions),
			]);
			setRoles(Array.isArray(roleList) ? roleList : []);
			setPermissions(Array.isArray(permissionList) ? permissionList : []);
		} catch (e) {
			setError(e?.message || "Không tải được vai trò và quyền.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<div className="mx-auto max-w-[900px] px-4 pb-16 pt-4 md:pt-[30px]">
			<Link
				to="/admin/users"
				className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
			>
				<ArrowLeft size={16} />
				Quản lý tài khoản
			</Link>

			<div className="flex flex-wrap items-center justify-between gap-3 pb-4">
				<div>
					<h1 className="text-2xl font-bold text-ink">Vai trò &amp; quyền</h1>
					<p className="mt-0.5 text-sm text-muted">
						Danh mục phân quyền của identity-service. Vai trò gom các quyền lại và được gán cho tài
						khoản.
					</p>
				</div>
				<Button variant="secondary" size="sm" onClick={load}>
					<ArrowClockwise size={16} />
					Làm mới
				</Button>
			</div>

			<Tabs items={TABS} value={tab} onChange={setTab} className="mb-4" />

			{tab === "roles" ? (
				<RolesTab
					roles={roles}
					permissions={permissions}
					loading={loading}
					error={error}
					reload={load}
				/>
			) : (
				<PermissionsTab permissions={permissions} loading={loading} error={error} reload={load} />
			)}
		</div>
	);
}
