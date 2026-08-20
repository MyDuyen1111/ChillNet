import {
	CaretDown,
	ChatCircleDots,
	NotePencil,
	WarningCircle,
} from "@phosphor-icons/react";
import { Avatar, Button, EmptyState, IconButton, Skeleton } from "../../../components/ui";
import { cn } from "../../../lib/cn";
import { useAuth } from "../../../lib/auth";
import { displayName } from "../../../lib/format";
import { conversationAvatar, conversationTitle, isGroup, shortTimeAgo } from "../utils";

function Row({ conv, active, currentUserId, onSelect }) {
	const title = conversationTitle(conv, currentUserId);
	const group = isGroup(conv);
	const unread = conv.unread > 0;
	const preview = conv.lastMessage
		? `${conv.lastMessageMine ? "Bạn: " : ""}${conv.lastMessage}`
		: group
			? "Nhóm mới, hãy bắt đầu trò chuyện"
			: "Chưa có tin nhắn";
	const meta = conv.lastMessageAt ? `${preview} · ${shortTimeAgo(conv.lastMessageAt)}` : preview;

	return (
		<button
			type="button"
			onClick={() => onSelect(conv.id)}
			className={cn(
				"flex w-full items-center gap-3 px-5 py-2 text-left transition-colors",
				active ? "bg-hover" : "hover:bg-hover",
			)}
		>
			<Avatar src={conversationAvatar(conv)} name={title} size="lg" />

			<div className="min-w-0 flex-1">
				<p className={cn("truncate text-sm text-ink", unread && "font-semibold")}>
					{title}
				</p>
				<p className="truncate text-xs text-muted">{meta}</p>
			</div>

			{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
		</button>
	);
}

function RowSkeleton() {
	return (
		<div className="flex items-center gap-3 px-5 py-2">
			<Skeleton className="h-14 w-14 rounded-full" />
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
	onCompose,
}) {
	const { user } = useAuth();
	const myName = displayName(user?.profile);

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-[60px] shrink-0 items-center justify-between border-b border-line px-5">
				<button type="button" className="flex items-center gap-1">
					<span className="text-base font-semibold text-ink">{myName}</span>
					<CaretDown size={14} className="text-ink" />
				</button>
				<IconButton label="Soạn tin mới" onClick={onCompose}>
					<NotePencil size={24} />
				</IconButton>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto py-2">
				{loading ? (
					<div>
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
					<div>
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
