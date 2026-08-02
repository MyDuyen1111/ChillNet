import { motion, useReducedMotion } from "motion/react";
import { Avatar, Button } from "../../../components/ui";
import { timeAgo } from "../../../lib/format";

// Best-effort deep link. Conservative on purpose: only navigate when the target
// route is unambiguous, otherwise just mark the notification read in place.
export function targetFor(n) {
	const t = (n.type || "").toUpperCase();
	if (n.relatedEntityType === "POST" && n.relatedEntityId)
		return `/post/${n.relatedEntityId}`;
	if (t.includes("MESSAGE") || t.includes("CHAT")) return "/messages";
	if (t.includes("FRIEND")) return "/friends";
	if (t.includes("FOLLOW") && n.relatedUserId)
		return `/profile/${n.relatedUserId}`;
	return null;
}

// Instagram rút gọn mốc thời gian ("2 ngày" thay vì "2 ngày trước"). lib/format
// chỉ có bản đầy đủ (addSuffix) nên bỏ hậu tố " trước" ở đây, không đụng file dùng chung.
function shortTimeAgo(value) {
	return timeAgo(value).replace(/\s*trước$/, "");
}

// true khi đây là lời mời kết bạn / theo dõi đang chờ (còn cần hành động), khác
// với thông báo "đã chấp nhận lời mời" (chỉ để đọc, không có nút Theo dõi).
function isPendingFollow(type) {
	const t = (type || "").toUpperCase();
	if (!t.includes("FRIEND") && !t.includes("FOLLOW")) return false;
	return !t.includes("ACCEPT") && !t.includes("CONFIRM");
}

export default function NotificationItem({ notification, onSelect }) {
	const reduce = useReducedMotion();
	const { type, title, content, isRead, createdAt } = notification;
	const unread = !isRead;
	const pendingFollow = isPendingFollow(type);

	const handleRowClick = () => onSelect(notification);
	const handleActionClick = (e) => {
		e.stopPropagation();
		onSelect(notification);
	};

	return (
		<motion.div
			role="button"
			tabIndex={0}
			onClick={handleRowClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleRowClick();
				}
			}}
			initial={reduce ? false : { opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-hover"
		>
			<Avatar size="md" />

			<div className="min-w-0 flex-1">
				<p className="line-clamp-2 text-sm text-ink">
					{title && <span className="font-semibold">{title} </span>}
					{content && <span className="font-normal">{content}</span>}
					{createdAt && <span className="text-muted"> {shortTimeAgo(createdAt)}</span>}
				</p>
			</div>

			{pendingFollow ? (
				<Button
					variant="primary"
					size="sm"
					onClick={handleActionClick}
					className="shrink-0"
				>
					Theo dõi
				</Button>
			) : (
				unread && (
					<span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
				)
			)}
		</motion.div>
	);
}
