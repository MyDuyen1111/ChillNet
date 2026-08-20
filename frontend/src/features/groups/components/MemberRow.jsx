import { Link } from "react-router-dom";
import { Avatar, Button } from "../../../components/ui";
import { roleMeta, relTime } from "../groupUtils";

const ROLE_OPTIONS = ["ADMIN", "MODERATOR", "MEMBER"];

// Một dòng thành viên, phẳng như danh sách followers của Instagram: avatar,
// username, dòng phụ (vai trò + thời gian tham gia), rồi tới các nút quản lý.
//
// Đổi vai trò cần quyền ADMIN của nhóm chứ không chỉ MODERATOR
// (GroupService.updateMemberRole gọi checkAdminPermission), và backend từ chối
// đổi vai trò của chủ nhóm — nên select chỉ hiện khi `canChangeRole`.
export default function MemberRow({
	member,
	ownerId,
	canManage = false,
	canChangeRole = false,
	currentUserId,
	busy = false,
	onRemove,
	onChangeRole,
}) {
	const owner = member.userId === ownerId;
	const meta = roleMeta(member.role);
	const roleLabel = owner ? "Chủ nhóm" : meta.label;
	const canRemove = canManage && !owner && member.userId !== currentUserId;
	const showRoleSelect = canChangeRole && !owner && member.userId !== currentUserId;

	return (
		<div className="flex items-center gap-3 py-2">
			<Link to={`/profile/${member.userId}`} className="shrink-0">
				<Avatar src={member.avatar} name={member.username} size="md" />
			</Link>
			<div className="min-w-0 flex-1">
				<Link
					to={`/profile/${member.userId}`}
					className="block truncate text-sm font-semibold text-ink hover:text-muted"
				>
					{member.username || "Người dùng"}
				</Link>
				<p className="truncate text-xs text-muted">
					{roleLabel}
					{member.joinedDate && ` · Tham gia ${relTime(member.joinedDate)}`}
				</p>
			</div>

			{showRoleSelect && (
				<select
					value={member.role || "MEMBER"}
					disabled={busy}
					onChange={(e) => onChangeRole?.(member, e.target.value)}
					aria-label={`Vai trò của ${member.username || "thành viên"}`}
					className="h-8 shrink-0 rounded border border-line bg-canvas px-2 text-xs text-ink focus:border-muted disabled:opacity-40"
				>
					{ROLE_OPTIONS.map((r) => (
						<option key={r} value={r}>
							{roleMeta(r).label}
						</option>
					))}
				</select>
			)}

			{canRemove && (
				<Button
					variant="secondary"
					size="sm"
					loading={busy}
					onClick={onRemove}
					className="shrink-0"
				>
					Xoá
				</Button>
			)}
		</div>
	);
}
