import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, DotsThreeVertical, UserCheck, UserPlus, X } from "@phosphor-icons/react";
import { Button, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

// Action buttons shown next to the profile username. On the owner's own
// profile this is just an "Edit profile" button; on someone else's it drives
// friend + follow state off the backend `friendStatus` string and the
// `isFollowing` flag, and asks the parent to reload after any mutation so the
// UI reflects the new relationship. The relationship-ending action (huỷ kết
// bạn) sits behind a small dropdown instead of a bare button, Instagram-style.
export default function RelationshipActions({ isSelf, onEdit, userId, status, isFollowing, onChanged }) {
	const toast = useToast();
	const [busy, setBusy] = useState(null);
	const [menuOpen, setMenuOpen] = useState(false);

	if (isSelf) {
		return (
			<Button variant="secondary" onClick={onEdit}>
				Chỉnh sửa trang cá nhân
			</Button>
		);
	}

	async function run(key, fn, successMsg) {
		setBusy(key);
		try {
			await fn();
			if (successMsg) toast.success(successMsg);
			await onChanged?.();
		} catch (err) {
			toast.error(err?.message || "Thao tác thất bại, thử lại sau.");
		} finally {
			setBusy(null);
			setMenuOpen(false);
		}
	}

	const s = String(status || "NONE").toUpperCase();

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
		</div>
	);
}
