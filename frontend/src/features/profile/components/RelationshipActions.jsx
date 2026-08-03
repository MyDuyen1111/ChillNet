import { useState } from "react";
import {
	Check,
	Clock,
	UserCheck,
	UserMinus,
	UserPlus,
	X,
} from "@phosphor-icons/react";
import { Button, useToast } from "../../../components/ui";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

// Action buttons shown on someone else's profile. Drives friend + follow state
// off the backend `friendStatus` string and the `isFollowing` flag, and asks the
// parent to reload after any mutation so the UI reflects the new relationship.
export default function RelationshipActions({ userId, status, isFollowing, onChanged }) {
	const toast = useToast();
	const [busy, setBusy] = useState(null);

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
		}
	}

	const s = String(status || "NONE").toUpperCase();

	// ---- friend button(s) by relationship status ----
	let friendButtons = null;
	if (s === "ACCEPTED") {
		friendButtons = (
			<Button
				variant="secondary"
				size="md"
				loading={busy === "friend"}
				onClick={() =>
					run(
						"friend",
						() => api.delete(endpoints.social.removeFriend(userId)),
						"Đã hủy kết bạn.",
					)
				}
			>
				<UserCheck size={18} weight="fill" />
				Bạn bè
			</Button>
		);
	} else if (s === "SENT") {
		friendButtons = (
			<Button
				variant="secondary"
				size="md"
				loading={busy === "friend"}
				onClick={() =>
					run(
						"friend",
						() => api.delete(endpoints.social.cancelRequest(userId)),
						"Đã hủy lời mời kết bạn.",
					)
				}
			>
				<Clock size={18} />
				Đã gửi lời mời
			</Button>
		);
	} else if (s === "RECEIVED") {
		friendButtons = (
			<div className="flex gap-2">
				<Button
					variant="primary"
					size="md"
					loading={busy === "accept"}
					onClick={() =>
						run(
							"accept",
							() => api.post(endpoints.social.acceptFriend(userId)),
							"Đã chấp nhận lời mời kết bạn.",
						)
					}
				>
					<Check size={18} />
					Chấp nhận
				</Button>
				<Button
					variant="outline"
					size="md"
					loading={busy === "reject"}
					onClick={() =>
						run(
							"reject",
							() => api.post(endpoints.social.rejectFriend(userId)),
							"Đã từ chối lời mời.",
						)
					}
				>
					<X size={18} />
					Từ chối
				</Button>
			</div>
		);
	} else {
		// NONE / REJECTED / anything else
		friendButtons = (
			<Button
				variant="primary"
				size="md"
				loading={busy === "friend"}
				onClick={() =>
					run(
						"friend",
						() => api.post(endpoints.social.sendFriendRequest(userId)),
						"Đã gửi lời mời kết bạn.",
					)
				}
			>
				<UserPlus size={18} />
				Kết bạn
			</Button>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{friendButtons}
			<Button
				variant={isFollowing ? "outline" : "secondary"}
				size="md"
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
				{isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
				{isFollowing ? "Đang theo dõi" : "Theo dõi"}
			</Button>
		</div>
	);
}
