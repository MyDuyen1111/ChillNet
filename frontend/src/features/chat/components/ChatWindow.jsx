import { Fragment, useEffect, useRef, useState } from "react";
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
	Modal,
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
import ConversationInfoModal from "./ConversationInfoModal";
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
	onEditMessage,
	onDeleteMessage,
	onConversationUpdated,
	onConversationGone,
	hasOlder = false,
	loadingOlder = false,
	onLoadOlder,
}) {
	const scrollRef = useRef(null);
	const [infoOpen, setInfoOpen] = useState(false);
	// Một modal xác nhận dùng chung cho cả luồng, thay vì mỗi bong bóng tự dựng
	// một portal riêng.
	const [pendingDelete, setPendingDelete] = useState(null);
	const [deleting, setDeleting] = useState(false);
	const title = conversation
		? conversationTitle(conversation, currentUserId)
		: "Đang tải...";
	const group = isGroup(conversation);
	const otherUser = otherParticipant(conversation, currentUserId);
	// Admin của hội thoại xoá được tin của người khác (validateDeletePermission).
	const iAmAdmin =
		!group ||
		(conversation?.participants ?? []).some(
			(p) => p.userId === currentUserId && p.role === "ADMIN",
		);

	// Bám đáy khi có tin mới (và lúc mới mở). Cố tình theo dõi id của tin CUỐI
	// chứ không phải messages.length: nạp thêm tin cũ cũng làm length tăng, và
	// nếu cuộn xuống đáy lúc đó thì người dùng bị ném khỏi chỗ đang đọc.
	const lastId = messages[messages.length - 1]?.id;
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [lastId, loading, conversationId]);

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
				<IconButton label="Thông tin cuộc trò chuyện" onClick={() => setInfoOpen(true)}>
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
						{hasOlder && (
							<div className="flex justify-center pb-4">
								<Button
									variant="secondary"
									size="sm"
									loading={loadingOlder}
									onClick={onLoadOlder}
								>
									Xem tin nhắn cũ hơn
								</Button>
							</div>
						)}

						{/* Phần giới thiệu đầu luồng chỉ đúng khi đã ở đầu thật sự;
						    còn tin cũ chưa nạp thì nó là lời nói dối về vị trí. */}
						{!hasOlder && (
							<ThreadIntro
								conversation={conversation}
								title={title}
								group={group}
								otherUser={otherUser}
							/>
						)}

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
											canDelete={iAmAdmin}
											onEdit={onEditMessage}
											onDeleteRequest={setPendingDelete}
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

			<ConversationInfoModal
				open={infoOpen}
				onClose={() => setInfoOpen(false)}
				conversation={conversation}
				currentUserId={currentUserId}
				onUpdated={onConversationUpdated}
				onGone={() => {
					setInfoOpen(false);
					onConversationGone?.();
				}}
			/>

			<Modal
				open={!!pendingDelete}
				onClose={() => !deleting && setPendingDelete(null)}
				title="Xoá tin nhắn"
				size="sm"
			>
				<p className="text-sm text-muted">
					Tin nhắn sẽ bị xoá vĩnh viễn với mọi người trong cuộc trò chuyện.
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>
						Huỷ
					</Button>
					<Button
						variant="danger"
						size="sm"
						loading={deleting}
						onClick={async () => {
							setDeleting(true);
							try {
								await onDeleteMessage?.(pendingDelete);
								setPendingDelete(null);
							} finally {
								setDeleting(false);
							}
						}}
					>
						Xoá
					</Button>
				</div>
			</Modal>
		</div>
	);
}
