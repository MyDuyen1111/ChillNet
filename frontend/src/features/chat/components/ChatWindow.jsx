import { Fragment, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
	CaretLeft,
	ChatCircle,
	Info,
	Phone,
	VideoCamera,
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
import {
	conversationAvatar,
	conversationTitle,
	formatDivider,
	isGroup,
	otherParticipant,
} from "../utils";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";

// Two consecutive messages this far apart (ms) get their own time divider.
const GROUP_GAP_MS = 15 * 60 * 1000;

function HeaderSubtitle({ conversation, connected }) {
	const group = isGroup(conversation);
	if (group) {
		return (
			<p className="truncate text-xs text-muted">
				{conversation?.participants?.length ?? 0} thành viên
			</p>
		);
	}
	return (
		<p className="truncate text-xs text-muted">
			{connected ? "Đang hoạt động" : "Đang đồng bộ..."}
		</p>
	);
}

function ThreadIntro({ conversation, title, group, otherUser }) {
	const navigate = useNavigate();
	const subtitle = group
		? `${conversation?.participants?.length ?? 0} thành viên`
		: otherUser?.username
			? `@${otherUser.username}`
			: "ChillNet";

	return (
		<div className="flex flex-col items-center gap-3 px-4 pb-8 pt-4 text-center">
			<Avatar src={conversationAvatar(conversation)} name={title} size="xl" />
			<div>
				<p className="text-xl font-semibold text-ink">{title}</p>
				<p className="text-sm text-muted">{subtitle}</p>
			</div>
			{!group && otherUser?.userId && (
				<Button
					variant="secondary"
					onClick={() => navigate(`/profile/${otherUser.userId}`)}
				>
					Xem trang cá nhân
				</Button>
			)}
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
					<Skeleton className={cn("h-10 rounded-[22px]", r.w)} />
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
	const otherUser = otherParticipant(conversation, currentUserId);

	// Stick to the bottom as new messages arrive (and on first load).
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length, loading, conversationId]);

	return (
		<div className="flex h-full min-w-0 flex-col">
			{/* Header */}
			<div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line px-4">
				<div className="md:hidden">
					<IconButton label="Quay lại" onClick={onBack}>
						<CaretLeft size={22} />
					</IconButton>
				</div>
				<Avatar src={conversationAvatar(conversation)} name={title} size="sm" />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-ink">{title}</p>
					<HeaderSubtitle conversation={conversation} connected={connected} />
				</div>
				<IconButton label="Gọi thoại">
					<Phone size={24} />
				</IconButton>
				<IconButton label="Gọi video">
					<VideoCamera size={24} />
				</IconButton>
				<IconButton label="Thông tin cuộc trò chuyện">
					<Info size={24} />
				</IconButton>
			</div>

			{/* Messages */}
			<div
				ref={scrollRef}
				className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-4"
			>
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
				) : (
					<>
						<ThreadIntro
							conversation={conversation}
							title={title}
							group={group}
							otherUser={otherUser}
						/>

						{messages.length === 0 ? (
							<EmptyState
								icon={ChatCircle}
								title="Chưa có tin nhắn"
								description={`Gửi lời chào tới ${title} để bắt đầu cuộc trò chuyện.`}
							/>
						) : (
							messages.map((m, i) => {
								const prev = messages[i - 1];
								const next = messages[i + 1];
								const sameAsPrev = prev && prev.sender?.userId === m.sender?.userId;
								const sameAsNext = next && next.sender?.userId === m.sender?.userId;
								const showDivider =
									i === 0 ||
									new Date(m.createdDate) - new Date(prev.createdDate) >
										GROUP_GAP_MS;
								return (
									<Fragment key={m.id}>
										{showDivider && (
											<p className="my-4 text-center text-xs text-muted">
												{formatDivider(m.createdDate)}
											</p>
										)}
										<MessageBubble
											message={m}
											group={group}
											showName={!sameAsPrev || showDivider}
											showAvatar={!sameAsNext}
										/>
									</Fragment>
								);
							})
						)}
					</>
				)}
			</div>

			{/* Composer */}
			<Composer onSend={onSend} disabled={!conversationId} />
		</div>
	);
}
