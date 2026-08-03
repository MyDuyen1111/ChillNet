import { motion, useReducedMotion } from "motion/react";
import {
	At,
	Bell,
	ChatCircle,
	ChatText,
	Heart,
	ShareNetwork,
	UserCheck,
	UserPlus,
	UsersThree,
} from "@phosphor-icons/react";
import { timeAgo } from "../../../lib/format";
import { cn } from "../../../lib/cn";

// Map a backend `type` string (FRIEND_REQUEST, POST_LIKE, POST_COMMENT,
// MESSAGE, ...) to a Phosphor icon + accent. Accent lock: brand (teal) for
// everything, rose reserved for the like/heart case only. Defaults to Bell.
function metaFor(type) {
	const t = (type || "").toUpperCase();
	const brand =
		"bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300";

	if (t.includes("LIKE"))
		return {
			Icon: Heart,
			weight: "fill",
			chip: "bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400",
		};
	if (t.includes("COMMENT") || t.includes("REPLY"))
		return { Icon: ChatCircle, weight: "fill", chip: brand };
	if (t.includes("MESSAGE") || t.includes("CHAT"))
		return { Icon: ChatText, weight: "fill", chip: brand };
	if (t.includes("FRIEND") && (t.includes("ACCEPT") || t.includes("CONFIRM")))
		return { Icon: UserCheck, weight: "fill", chip: brand };
	if (t.includes("FRIEND") || t.includes("FOLLOW"))
		return { Icon: UserPlus, weight: "fill", chip: brand };
	if (t.includes("GROUP")) return { Icon: UsersThree, weight: "fill", chip: brand };
	if (t.includes("MENTION") || t.includes("TAG"))
		return { Icon: At, weight: "bold", chip: brand };
	if (t.includes("SHARE"))
		return { Icon: ShareNetwork, weight: "fill", chip: brand };
	return { Icon: Bell, weight: "fill", chip: brand };
}

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

export default function NotificationItem({ notification, onSelect }) {
	const reduce = useReducedMotion();
	const { type, title, content, isRead, createdAt } = notification;
	const unread = !isRead;
	const { Icon, weight, chip } = metaFor(type);

	return (
		<motion.button
			type="button"
			onClick={() => onSelect(notification)}
			initial={reduce ? false : { opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className={cn(
				"group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
				unread
					? "bg-brand-50 hover:bg-brand-100/70 dark:bg-brand-900/20 dark:hover:bg-brand-900/30"
					: "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
			)}
		>
			<span
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
					chip,
				)}
			>
				<Icon size={18} weight={weight} />
			</span>

			<div className="min-w-0 flex-1">
				{title && (
					<p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
						{title}
					</p>
				)}
				{content && (
					<p
						className={cn(
							"line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400",
							title ? "mt-0.5" : "font-medium text-zinc-800 dark:text-zinc-200",
						)}
					>
						{content}
					</p>
				)}
				<p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">
					{timeAgo(createdAt)}
				</p>
			</div>

			{unread && (
				<span
					aria-hidden
					className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
				/>
			)}
		</motion.button>
	);
}
