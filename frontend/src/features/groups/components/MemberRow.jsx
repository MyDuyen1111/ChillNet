import { Link } from "react-router-dom";
import { Avatar, Button } from "../../../components/ui";
import { roleMeta, relTime } from "../groupUtils";

// Một dòng thành viên, phẳng như danh sách followers của Instagram: avatar,
// username, dòng phụ (vai trò + thời gian tham gia), nút "Xoá" chỉ hiện với
// quản trị viên (và không áp dụng cho chủ nhóm hoặc chính người xem).
export default function MemberRow({ member, ownerId, canManage = false, currentUserId, busy = false, onRemove }) {
	const owner = member.userId === ownerId;
	const meta = roleMeta(member.role);
	const roleLabel = owner ? "Chủ nhóm" : meta.label;
	const canRemove = canManage && !owner && member.userId !== currentUserId;

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
