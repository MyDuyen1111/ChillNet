import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Check, Checks } from "@phosphor-icons/react";
import { Avatar, Modal } from "../../../components/ui";
import { timeAgo } from "../../../lib/format";
import { fetchProfiles } from "../../../lib/profiles";
import { isGroup, participantName } from "../utils";
import useReadReceipts from "../hooks/useReadReceipts";

// Danh sách người đã xem trong hội thoại nhóm.
//
// Tên và avatar lấy thẳng từ `conversation.participants`: ParticipantInfo của
// chat-service đã kèm sẵn firstName/lastName/avatar, nên đường rẻ nhất là 0
// request. Chỉ người đã rời nhóm (còn receipt nhưng không còn trong danh sách
// thành viên) mới phải hỏi profile-service, và chỉ khi người dùng thật sự mở
// hộp thoại này.
function ReaderListModal({ open, onClose, readers, participantsById }) {
	const [extraProfiles, setExtraProfiles] = useState(() => new Map());

	const missingKey = useMemo(
		() =>
			readers
				.map((r) => r.userId)
				.filter((id) => !participantsById.has(id))
				.join(","),
		[readers, participantsById],
	);

	useEffect(() => {
		if (!open || !missingKey) return undefined;
		let alive = true;
		fetchProfiles(missingKey.split(","))
			.then((map) => alive && setExtraProfiles(map))
			.catch(() => {
				// Thiếu tên thì hiện "Người dùng", không phá cả hộp thoại.
			});
		return () => {
			alive = false;
		};
	}, [open, missingKey]);

	return (
		<Modal open={open} onClose={onClose} title="Đã xem bởi" size="sm">
			<div className="divide-y divide-line">
				{readers.map((reader) => {
					const person = participantsById.get(reader.userId) ?? extraProfiles.get(reader.userId);
					const name = participantName(person);
					return (
						<div key={reader.userId} className="flex items-center gap-3 py-2">
							<Link to={`/profile/${reader.userId}`} onClick={onClose} className="shrink-0">
								<Avatar src={person?.avatar} name={name} size="sm" />
							</Link>
							<span className="min-w-0 flex-1">
								<Link
									to={`/profile/${reader.userId}`}
									onClick={onClose}
									className="block truncate text-sm text-ink hover:underline"
								>
									{name}
								</Link>
								<span className="block text-xs text-muted">{timeAgo(reader.readAt)}</span>
							</span>
						</div>
					);
				})}
			</div>
		</Modal>
	);
}

/**
 * Dòng trạng thái kiểu Messenger đặt dưới tin nhắn CUỐI CÙNG do mình gửi.
 *
 * Cố tình chỉ gắn vào một tin: `useReadReceipts` gọi
 * GET /messages/{id}/read-receipts, nên nếu render dòng này cho mọi bong bóng
 * thì mở một hội thoại sẽ bắn hàng chục request.
 *
 * Chưa ai xem thì hiện "Đã gửi"; gọi API hỏng thì không hiện gì cả (`ready`
 * chỉ bật khi có dữ liệu thật) — trạng thái đã xem không đáng để làm phiền.
 */
export default function ReadReceiptStatus({ message, conversation, currentUserId, refreshKey }) {
	const reduce = useReducedMotion();
	const [listOpen, setListOpen] = useState(false);
	const group = isGroup(conversation);

	const participantsById = useMemo(
		() => new Map((conversation?.participants ?? []).map((p) => [p.userId, p])),
		[conversation],
	);

	// Mốc để vòng hỏi lại tự dừng: mọi thành viên khác đều đã xem.
	const expectedReaders = useMemo(
		() => (conversation?.participants ?? []).filter((p) => p.userId !== currentUserId).length,
		[conversation, currentUserId],
	);

	const { receipts, ready } = useReadReceipts({
		messageId: message?.id,
		currentUserId,
		expectedReaders,
		refreshKey,
	});

	// Ai xem trước đứng trước, để danh sách không nhảy lung tung giữa hai lần hỏi.
	const readers = useMemo(
		() => receipts.slice().sort((a, b) => new Date(a.readAt || 0) - new Date(b.readAt || 0)),
		[receipts],
	);

	if (!ready) return null;

	const wrapper = (children) => (
		<motion.div
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.18 }}
			className="flex justify-end px-1 pb-1 pt-0.5"
		>
			{children}
		</motion.div>
	);

	if (readers.length === 0) {
		return wrapper(
			<span className="flex items-center gap-1 text-xs text-muted">
				<Check size={12} weight="bold" />
				Đã gửi
			</span>,
		);
	}

	if (!group) {
		return wrapper(
			<span className="text-xs text-muted">Đã xem {timeAgo(readers[0].readAt)}</span>,
		);
	}

	return (
		<>
			{wrapper(
				<button
					type="button"
					onClick={() => setListOpen(true)}
					aria-label={`Xem danh sách ${readers.length} người đã xem`}
					className="flex items-center gap-1 text-xs text-muted transition-opacity hover:opacity-70"
				>
					<Checks size={13} weight="bold" />
					Đã xem bởi {readers.length} người
				</button>,
			)}
			<ReaderListModal
				open={listOpen}
				onClose={() => setListOpen(false)}
				readers={readers}
				participantsById={participantsById}
			/>
		</>
	);
}
