import { Link } from "react-router-dom";
import { Crown } from "@phosphor-icons/react";
import { Avatar } from "../../../components/ui";
import { roleMeta, relTime } from "../groupUtils";

// Một dòng thành viên. Owner ưu tiên hiển thị "Chủ nhóm"; còn lại theo role.
export default function MemberRow({ member, ownerId }) {
	const isOwner = member.userId === ownerId;
	const meta = roleMeta(member.role);
	const Icon = isOwner ? Crown : meta.Icon;
	const label = isOwner ? "Chủ nhóm" : meta.label;
	const tint = isOwner
		? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
		: meta.tint;

	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<Link to={`/profile/${member.userId}`} className="shrink-0">
				<Avatar src={member.avatar} name={member.username} size="md" />
			</Link>
			<div className="min-w-0 flex-1">
				<Link
					to={`/profile/${member.userId}`}
					className="block truncate text-sm font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
				>
					{member.username || "Người dùng"}
				</Link>
				{member.joinedDate && (
					<p className="truncate text-xs text-zinc-500">Tham gia {relTime(member.joinedDate)}</p>
				)}
			</div>
			<span
				className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tint}`}
			>
				<Icon size={13} weight="fill" />
				{label}
			</span>
		</div>
	);
}
