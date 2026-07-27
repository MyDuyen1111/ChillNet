import { motion, useReducedMotion } from "motion/react";
import { Avatar } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { formatClock, participantName } from "../utils";

// One chat bubble. Mine = right-aligned brand fill; others = left-aligned zinc.
// `showName`/`showAvatar` are driven by run-grouping in ChatWindow so stacked
// messages from the same sender read as one block.
export default function MessageBubble({ message, group, showName, showAvatar }) {
	const reduce = useReducedMotion();
	const mine = message.me;
	const name = participantName(message.sender);

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className={cn("flex w-full gap-2", mine ? "justify-end" : "justify-start")}
		>
			{!mine &&
				(showAvatar ? (
					<Avatar
						src={message.sender?.avatar}
						name={name}
						size="sm"
						className="mt-auto"
					/>
				) : (
					<span className="w-8 shrink-0" aria-hidden="true" />
				))}

			<div className={cn("flex max-w-[76%] flex-col sm:max-w-[70%]", mine && "items-end")}>
				{group && showName && !mine && (
					<span className="mb-0.5 ml-1 text-xs font-medium text-zinc-500">
						{name}
					</span>
				)}
				<div
					className={cn(
						"whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
						mine
							? "rounded-br-md bg-brand-600 text-white"
							: "rounded-bl-md bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
						message.pending && "opacity-70",
					)}
				>
					{message.message}
				</div>
				<span className="mt-0.5 px-1 font-mono text-[10px] text-zinc-400">
					{message.pending ? "Đang gửi..." : formatClock(message.createdDate)}
				</span>
			</div>
		</motion.div>
	);
}
