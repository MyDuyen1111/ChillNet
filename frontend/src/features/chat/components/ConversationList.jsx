import { ChatCircleDots, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { Avatar, Button, EmptyState, Skeleton } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { timeAgo } from "../../../lib/format";
import { conversationAvatar, conversationTitle, isGroup } from "../utils";

function Row({ conv, active, currentUserId, onSelect }) {
	const title = conversationTitle(conv, currentUserId);
	const group = isGroup(conv);
	const preview = conv.lastMessage
		? `${conv.lastMessageMine ? "Bạn: " : ""}${conv.lastMessage}`
		: group
			? "Nhóm mới, hãy bắt đầu trò chuyện"
			: "Chưa có tin nhắn";

	return (
		<button
			type="button"
			onClick={() => onSelect(conv.id)}
			className={cn(
				"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
				active
					? "bg-brand-50 dark:bg-brand-900/30"
					: "hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
			)}
		>
			<div className="relative shrink-0">
				<Avatar src={conversationAvatar(conv)} name={title} size="md" />
				{group && (
					<span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 ring-2 ring-white dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-900">
						<UsersThree size={10} weight="fill" />
					</span>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<p
						className={cn(
							"truncate text-sm",
							conv.unread > 0
								? "font-semibold text-zinc-900 dark:text-zinc-50"
								: "font-medium text-zinc-800 dark:text-zinc-100",
						)}
					>
						{title}
					</p>
					{conv.lastMessageAt && (
						<span className="shrink-0 text-[11px] text-zinc-400">
							{timeAgo(conv.lastMessageAt)}
						</span>
					)}
				</div>
				<div className="flex items-center justify-between gap-2">
					<p
						className={cn(
							"truncate text-xs",
							conv.unread > 0
								? "text-zinc-700 dark:text-zinc-200"
								: "text-zinc-500",
						)}
					>
						{preview}
					</p>
					{conv.unread > 0 && (
						<span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
							{conv.unread > 9 ? "9+" : conv.unread}
						</span>
					)}
				</div>
			</div>
		</button>
	);
}

function RowSkeleton() {
	return (
		<div className="flex items-center gap-3 px-3 py-2.5">
			<Skeleton className="h-10 w-10 rounded-full" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-3.5 w-1/2" />
				<Skeleton className="h-3 w-3/4" />
			</div>
		</div>
	);
}

export default function ConversationList({
	conversations,
	activeId,
	loading,
	error,
	currentUserId,
	onSelect,
	onRetry,
}) {
	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
				<h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
					Tin nhắn
				</h1>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-2">
				{loading ? (
					<div className="space-y-1">
						{Array.from({ length: 7 }).map((_, i) => (
							<RowSkeleton key={i} />
						))}
					</div>
				) : error ? (
					<EmptyState
						icon={WarningCircle}
						title="Không tải được"
						description={error}
						action={
							<Button size="sm" variant="outline" onClick={onRetry}>
								Thử lại
							</Button>
						}
					/>
				) : conversations.length === 0 ? (
					<EmptyState
						icon={ChatCircleDots}
						title="Chưa có cuộc trò chuyện"
						description="Kết bạn và bắt đầu nhắn tin để thấy các cuộc trò chuyện ở đây."
					/>
				) : (
					<div className="space-y-0.5">
						{conversations.map((conv) => (
							<Row
								key={conv.id}
								conv={conv}
								active={conv.id === activeId}
								currentUserId={currentUserId}
								onSelect={onSelect}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
