import { useEffect, useRef } from "react";
import {
	ArrowLeft,
	ChatCircle,
	UsersThree,
	WarningCircle,
} from "@phosphor-icons/react";
import {
	Avatar,
	Button,
	EmptyState,
	IconButton,
	Skeleton,
} from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { conversationAvatar, conversationTitle, isGroup } from "../utils";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";

function HeaderSubtitle({ conversation, connected }) {
	const group = isGroup(conversation);
	const dot = connected ? "bg-brand-500" : "bg-amber-500";
	const label = connected ? "Trực tuyến" : "Đang đồng bộ";
	return (
		<div className="flex items-center gap-1.5 text-xs text-zinc-500">
			<span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
			<span>
				{group
					? `${conversation?.participants?.length ?? 0} thành viên`
					: label}
			</span>
		</div>
	);
}

function MessagesSkeleton() {
	const rows = [
		{ mine: false, w: "w-40" },
		{ mine: true, w: "w-52" },
		{ mine: false, w: "w-32" },
		{ mine: true, w: "w-44" },
		{ mine: false, w: "w-48" },
	];
	return (
		<div className="space-y-4">
			{rows.map((r, i) => (
				<div
					key={i}
					className={cn("flex", r.mine ? "justify-end" : "justify-start")}
				>
					<Skeleton className={cn("h-10 rounded-2xl", r.w)} />
				</div>
			))}
		</div>
	);
}

export default function ChatWindow({
	conversation,
	conversationId,
	messages,
	loading,
	error,
	connected,
	currentUserId,
	onSend,
	onBack,
	onRetry,
}) {
	const scrollRef = useRef(null);
	const title = conversation
		? conversationTitle(conversation, currentUserId)
		: "Đang tải...";
	const group = isGroup(conversation);

	// Stick to the bottom as new messages arrive (and on first load).
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length, loading, conversationId]);

	return (
		<div className="flex h-full min-w-0 flex-col bg-zinc-50 dark:bg-zinc-950">
			{/* Header */}
			<div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
				<div className="lg:hidden">
					<IconButton label="Quay lại" onClick={onBack}>
						<ArrowLeft size={20} />
					</IconButton>
				</div>
				<Avatar src={conversationAvatar(conversation)} name={title} size="md" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
						{title}
					</p>
					<HeaderSubtitle conversation={conversation} connected={connected} />
				</div>
				{group && (
					<span className="hidden items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 sm:flex">
						<UsersThree size={14} />
						Nhóm
					</span>
				)}
			</div>

			{/* Messages */}
			<div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
				{loading ? (
					<MessagesSkeleton />
				) : error ? (
					<EmptyState
						icon={WarningCircle}
						title="Không tải được tin nhắn"
						description={error}
						action={
							<Button size="sm" variant="outline" onClick={onRetry}>
								Thử lại
							</Button>
						}
					/>
				) : messages.length === 0 ? (
					<EmptyState
						icon={ChatCircle}
						title="Chưa có tin nhắn"
						description={`Gửi lời chào tới ${title} để bắt đầu cuộc trò chuyện.`}
					/>
				) : (
					<div className="space-y-1.5">
						{messages.map((m, i) => {
							const prev = messages[i - 1];
							const next = messages[i + 1];
							const sameAsPrev = prev && prev.sender?.userId === m.sender?.userId;
							const sameAsNext = next && next.sender?.userId === m.sender?.userId;
							return (
								<MessageBubble
									key={m.id}
									message={m}
									group={group}
									showName={!sameAsPrev}
									showAvatar={!sameAsNext}
								/>
							);
						})}
					</div>
				)}
			</div>

			{/* Composer */}
			<Composer onSend={onSend} disabled={!conversationId} />
		</div>
	);
}
