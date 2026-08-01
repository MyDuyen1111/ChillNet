import { motion, useReducedMotion } from "motion/react";
import { ArrowBendUpLeft, DotsThree, Smiley } from "@phosphor-icons/react";
import { Avatar, IconButton } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { participantName } from "../utils";

// One chat bubble. Mine = right-aligned accent fill; others = left-aligned
// neutral fill. `showName`/`showAvatar` are driven by run-grouping in
// ChatWindow so stacked messages from the same sender read as one block.
export default function MessageBubble({ message, group, showName, showAvatar }) {
	const reduce = useReducedMotion();
	const mine = message.me;
	const name = participantName(message.sender);
	// Not populated by the backend today (text-only messages); kept so the
	// bubble renders correctly the moment an image field is added.
	const isImage = !!message.imageUrl;

	const actions = (
		<div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
			<IconButton label="Thả cảm xúc">
				<Smiley size={16} className="text-muted" />
			</IconButton>
			<IconButton label="Trả lời">
				<ArrowBendUpLeft size={16} className="text-muted" />
			</IconButton>
			<IconButton label="Thêm tuỳ chọn">
				<DotsThree size={16} className="text-muted" />
			</IconButton>
		</div>
	);

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className={cn(
				"group flex w-full items-end gap-2",
				mine ? "justify-end" : "justify-start",
			)}
		>
			{!mine &&
				(showAvatar ? (
					<Avatar src={message.sender?.avatar} name={name} size="xs" />
				) : (
					<span className="w-6 shrink-0" aria-hidden="true" />
				))}

			{mine && actions}

			<div className={cn("flex max-w-[65%] flex-col", mine && "items-end")}>
				{group && showName && !mine && (
					<span className="mb-0.5 ml-1 text-xs text-muted">{name}</span>
				)}
				{isImage ? (
					<div className="max-w-[250px] overflow-hidden rounded-[22px]">
						<img
							src={message.imageUrl}
							alt="Hình ảnh"
							className="w-full object-cover"
						/>
					</div>
				) : (
					<div
						className={cn(
							"whitespace-pre-wrap break-words rounded-[22px] px-4 py-2 text-sm",
							mine ? "bg-accent text-white" : "bg-fill text-ink",
							message.pending && "opacity-70",
						)}
					>
						{message.message}
					</div>
				)}
				{message.pending && (
					<span className="mt-0.5 px-1 text-xs text-muted">Đang gửi...</span>
				)}
			</div>

			{!mine && actions}
		</motion.div>
	);
}
