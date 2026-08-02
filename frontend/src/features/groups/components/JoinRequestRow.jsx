import { Link } from "react-router-dom";
import { Avatar, Button } from "../../../components/ui";
import { relTime } from "../groupUtils";

// Dòng yêu cầu tham gia (chỉ admin/moderator thấy), phẳng như dòng lời mời
// kết bạn của Instagram: chữ xanh để duyệt, nút xám để từ chối.
export default function JoinRequestRow({ request, busy, onApprove, onReject }) {
	return (
		<div className="flex items-center gap-3 py-2">
			<Link to={`/profile/${request.userId}`} className="shrink-0">
				<Avatar src={request.avatar} name={request.username} size="md" />
			</Link>
			<div className="min-w-0 flex-1">
				<Link
					to={`/profile/${request.userId}`}
					className="block truncate text-sm font-semibold text-ink hover:text-muted"
				>
					{request.username || "Người dùng"}
				</Link>
				<p className="truncate text-xs text-muted">
					Gửi {relTime(request.requestedDate)}
					{request.message && ` · "${request.message}"`}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<Button variant="link" size="sm" loading={busy} onClick={onApprove}>
					Duyệt
				</Button>
				<Button variant="secondary" size="sm" disabled={busy} onClick={onReject}>
					Từ chối
				</Button>
			</div>
		</div>
	);
}
