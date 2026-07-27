import { Link } from "react-router-dom";
import { Check, X } from "@phosphor-icons/react";
import { Avatar, Button } from "../../../components/ui";
import { relTime } from "../groupUtils";

// Dòng yêu cầu tham gia (chỉ admin/moderator thấy). Nút duyệt/từ chối.
export default function JoinRequestRow({ request, busy, onApprove, onReject }) {
	return (
		<div className="flex items-start gap-3 px-4 py-3">
			<Link to={`/profile/${request.userId}`} className="shrink-0">
				<Avatar src={request.avatar} name={request.username} size="md" />
			</Link>
			<div className="min-w-0 flex-1">
				<Link
					to={`/profile/${request.userId}`}
					className="block truncate text-sm font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
				>
					{request.username || "Người dùng"}
				</Link>
				<p className="text-xs text-zinc-500">Gửi {relTime(request.requestedDate)}</p>
				{request.message && (
					<p className="mt-1.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
						{request.message}
					</p>
				)}
				<div className="mt-2 flex gap-2">
					<Button size="sm" variant="primary" loading={busy} onClick={onApprove}>
						<Check size={16} weight="bold" /> Duyệt
					</Button>
					<Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
						<X size={16} /> Từ chối
					</Button>
				</div>
			</div>
		</div>
	);
}
