import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
	Check,
	DotsThree,
	DotsThreeVertical,
	Flag,
	Prohibit,
	UserCheck,
	UserPlus,
	X,
} from "@phosphor-icons/react";
import { Button, IconButton, Modal, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";
import ReportModal from "../../moderation/ReportModal";

// Action buttons shown next to the profile username. On the owner's own
// profile this is just an "Edit profile" button; on someone else's it drives
// friend + follow state off the backend `friendStatus` string and the
// `isFollowing` flag, and asks the parent to reload after any mutation so the
// UI reflects the new relationship. The relationship-ending action (huỷ kết
// bạn) sits behind a small dropdown instead of a bare button, Instagram-style.
export default function RelationshipActions({ isSelf, onEdit, userId, status, isFollowing, onChanged }) {
	const toast = useToast();
	const navigate = useNavigate();
	const [busy, setBusy] = useState(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [confirmBlock, setConfirmBlock] = useState(false);
	const [blocked, setBlocked] = useState(false);

	// GET /blocks/check/{id} trả boolean trần. Không có nó thì nút chỉ đoán được
	// trạng thái, và người dùng sẽ bấm "Chặn" lên một người họ đã chặn rồi —
	// backend trả USER_ALREADY_BLOCKED chứ không im lặng.
	useEffect(() => {
		if (isSelf || !userId) return;
		let alive = true;
		api.get(endpoints.social.isBlocked(userId))
			.then((v) => alive && setBlocked(Boolean(v)))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [isSelf, userId]);

	if (isSelf) {
		return (
			<Button variant="secondary" onClick={onEdit}>
				Chỉnh sửa trang cá nhân
			</Button>
		);
	}

	// Trả về true/false để những chỗ cần đổi state cục bộ (chặn / bỏ chặn) biết
	// thao tác có thật sự thành công hay không — `run` nuốt lỗi để hiện toast.
	async function run(key, fn, successMsg) {
		setBusy(key);
		try {
			await fn();
			if (successMsg) toast.success(successMsg);
			await onChanged?.();
			return true;
		} catch (err) {
			toast.error(err?.message || "Thao tác thất bại, thử lại sau.");
			return false;
		} finally {
			setBusy(null);
			setMenuOpen(false);
		}
	}

	const s = String(status || "NONE").toUpperCase();

	async function openConversation() {
		setBusy("message");
		try {
			const conversation = await api.post(endpoints.chat.conversations, {
				participantIds: [userId],
			});
			if (!conversation?.id) throw new Error("Không mở được cuộc trò chuyện.");
			navigate(`/messages/${conversation.id}`);
		} catch (err) {
			toast.error(err?.message || "Không mở được cuộc trò chuyện.");
		} finally {
			setBusy(null);
		}
	}

	// ---- friend button(s) by relationship status ----
	let friendButton = null;
	if (s === "ACCEPTED") {
		friendButton = (
			<div className="relative">
				<Button
					variant="secondary"
					loading={busy === "friend"}
					onClick={() => setMenuOpen((v) => !v)}
				>
					<UserCheck size={16} weight="fill" />
					Bạn bè
					<DotsThreeVertical size={16} />
				</Button>
				<AnimatePresence>
					{menuOpen && (
						<>
							<div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: -4 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: -4 }}
								transition={{ duration: 0.12 }}
								className="absolute left-0 top-9 z-20 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
							>
								<button
									type="button"
									onClick={() =>
										run(
											"friend",
											() => api.delete(endpoints.social.removeFriend(userId)),
											"Đã hủy kết bạn.",
										)
									}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-like hover:bg-hover"
								>
									<X size={16} />
									Hủy kết bạn
								</button>
							</motion.div>
						</>
					)}
				</AnimatePresence>
			</div>
		);
	} else if (s === "SENT") {
		friendButton = (
			<Button
				variant="secondary"
				loading={busy === "friend"}
				onClick={() =>
					run(
						"friend",
						() => api.delete(endpoints.social.cancelRequest(userId)),
						"Đã hủy lời mời kết bạn.",
					)
				}
			>
				Hủy lời mời
			</Button>
		);
	} else if (s === "RECEIVED") {
		friendButton = (
			<div className="flex gap-2">
				<Button
					variant="primary"
					loading={busy === "accept"}
					onClick={() =>
						run(
							"accept",
							() => api.post(endpoints.social.acceptFriend(userId)),
							"Đã chấp nhận lời mời kết bạn.",
						)
					}
				>
					<Check size={16} />
					Chấp nhận
				</Button>
				<Button
					variant="secondary"
					loading={busy === "reject"}
					onClick={() =>
						run(
							"reject",
							() => api.post(endpoints.social.rejectFriend(userId)),
							"Đã từ chối lời mời.",
						)
					}
				>
					<X size={16} />
					Từ chối
				</Button>
			</div>
		);
	} else {
		// NONE / REJECTED / anything else
		friendButton = (
			<Button
				variant="primary"
				loading={busy === "friend"}
				onClick={() =>
					run(
						"friend",
						() => api.post(endpoints.social.sendFriendRequest(userId)),
						"Đã gửi lời mời kết bạn.",
					)
				}
			>
				<UserPlus size={16} />
				Kết bạn
			</Button>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{friendButton}
			{/* chat-service tạo được hội thoại với bất kỳ ai, không đòi phải là bạn
			    bè, nên nút này không còn giới hạn ở trạng thái ACCEPTED nữa. */}
			<Button variant="secondary" loading={busy === "message"} onClick={openConversation}>
				Nhắn tin
			</Button>
			<Button
				variant={isFollowing ? "secondary" : "primary"}
				loading={busy === "follow"}
				onClick={() =>
					run(
						"follow",
						() =>
							isFollowing
								? api.delete(endpoints.social.unfollow(userId))
								: api.post(endpoints.social.follow(userId)),
						isFollowing ? "Đã bỏ theo dõi." : "Đã theo dõi.",
					)
				}
			>
				{isFollowing ? "Đang theo dõi" : "Theo dõi"}
			</Button>

			{/* Chặn + báo cáo tài khoản. Hai endpoint này đã có ở backend
			    (POST /blocks/{id} và TargetType.USER của moderation-service)
			    nhưng trước đây không có nút nào gọi tới: giao diện chỉ có "Bỏ
			    chặn" ở tab Đã chặn, mà tab đó thì không bao giờ có dữ liệu. */}
			<div className="relative">
				<IconButton label="Tuỳ chọn khác" onClick={() => setMoreOpen((v) => !v)}>
					<DotsThree size={20} weight="bold" />
				</IconButton>
				<AnimatePresence>
					{moreOpen && (
						<>
							<div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: -4 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: -4 }}
								transition={{ duration: 0.12 }}
								className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
							>
								<button
									type="button"
									onClick={async () => {
										setMoreOpen(false);
										if (!blocked) return setConfirmBlock(true);
										const ok = await run(
											"block",
											() => api.delete(endpoints.social.unblock(userId)),
											"Đã bỏ chặn người này.",
										);
										if (ok) setBlocked(false);
									}}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-hover"
								>
									<Prohibit size={16} />
									{blocked ? "Bỏ chặn" : "Chặn"}
								</button>
								<button
									type="button"
									onClick={() => {
										setMoreOpen(false);
										setReportOpen(true);
									}}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-like hover:bg-hover"
								>
									<Flag size={16} />
									Báo cáo tài khoản
								</button>
							</motion.div>
						</>
					)}
				</AnimatePresence>
			</div>

			<Modal
				open={confirmBlock}
				onClose={() => busy !== "block" && setConfirmBlock(false)}
				title="Chặn người này?"
				size="sm"
			>
				<p className="text-sm text-muted">
					Chặn sẽ huỷ quan hệ bạn bè và bỏ theo dõi hai chiều giữa hai bên. Bạn có
					thể bỏ chặn bất cứ lúc nào ở trang Bạn bè.
				</p>
				<div className="mt-5 flex justify-end gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setConfirmBlock(false)}
						disabled={busy === "block"}
					>
						Huỷ
					</Button>
					<Button
						variant="danger"
						size="sm"
						loading={busy === "block"}
						onClick={async () => {
							const ok = await run(
								"block",
								() => api.post(endpoints.social.block(userId)),
								"Đã chặn người này.",
							);
							if (ok) setBlocked(true);
							setConfirmBlock(false);
						}}
					>
						Chặn
					</Button>
				</div>
			</Modal>

			<ReportModal
				open={reportOpen}
				onClose={() => setReportOpen(false)}
				targetType="USER"
				targetId={userId}
			/>
		</div>
	);
}
