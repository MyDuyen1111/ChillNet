import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Avatar, Button } from "../../../components/ui";
import { displayName } from "../../../lib/format";

// One person in a relationship list, rendered as an Instagram-style flat row:
// avatar, username + secondary line, action button(s) on the right. The action
// row is driven by `tab` so the same row serves every section (friends /
// requests / suggestions / blocked). Terminal actions call `onAction(type, item)`
// (page owns the API + optimistic removal); "Huỷ kết bạn" defers to a confirm
// modal via `onConfirmRemoveFriend`.
export default function UserCard({ item, tab, onAction, onConfirmRemoveFriend }) {
	const reduce = useReducedMotion();
	const [busy, setBusy] = useState(null); // action type currently in-flight
	const [following, setFollowing] = useState(false);

	const profile = item.profile;
	const name = displayName(profile);
	const handle = profile?.username;
	const primaryText = handle || name;
	const secondaryText = tab === "suggested" ? "Gợi ý cho bạn" : handle ? name : null;

	async function run(type) {
		if (busy) return false;
		setBusy(type);
		try {
			await onAction(type, item);
			return true;
		} catch {
			// Page already surfaces the error toast; just release the button.
			return false;
		} finally {
			setBusy(null);
		}
	}

	async function toggleFollow() {
		if (busy) return;
		const next = !following;
		const ok = await run(next ? "follow" : "unfollow");
		if (ok) setFollowing(next);
	}

	return (
		<motion.div
			layout={!reduce}
			initial={reduce ? false : { opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className="flex items-center gap-3 py-2"
		>
			<Link to={`/profile/${item.userId}`} className="shrink-0">
				<Avatar src={profile?.avatar} name={name} size="md" />
			</Link>

			<Link to={`/profile/${item.userId}`} className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-ink">{primaryText}</p>
				{secondaryText && <p className="truncate text-xs text-muted">{secondaryText}</p>}
			</Link>

			<div className="flex shrink-0 items-center gap-2">
				{tab === "friends" && (
					<>
						<Button
							variant="secondary"
							size="sm"
							loading={busy === "message"}
							disabled={!!busy}
							onClick={() => run("message")}
						>
							Nhắn tin
						</Button>
						<Button variant="secondary" size="sm" onClick={() => onConfirmRemoveFriend(item)}>
							Bạn bè
						</Button>
					</>
				)}

				{tab === "received" && (
					<>
						<Button
							variant="link"
							size="sm"
							disabled={!!busy}
							loading={busy === "accept"}
							onClick={() => run("accept")}
						>
							Chấp nhận
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={!!busy}
							loading={busy === "reject"}
							onClick={() => run("reject")}
						>
							Xoá
						</Button>
					</>
				)}

				{tab === "sent" && (
					<Button
						variant="secondary"
						size="sm"
						disabled={!!busy}
						loading={busy === "cancel"}
						onClick={() => run("cancel")}
					>
						Huỷ
					</Button>
				)}

				{tab === "suggested" && (
					<>
						<Button
							variant="link"
							size="sm"
							disabled={!!busy}
							loading={busy === "addFriend"}
							onClick={() => run("addFriend")}
						>
							Kết bạn
						</Button>
						<Button
							variant="secondary"
							size="sm"
							disabled={!!busy}
							loading={busy === "follow" || busy === "unfollow"}
							onClick={toggleFollow}
						>
							{following ? "Đang theo dõi" : "Theo dõi"}
						</Button>
					</>
				)}

				{tab === "blocked" && (
					<Button
						variant="secondary"
						size="sm"
						disabled={!!busy}
						loading={busy === "unblock"}
						onClick={() => run("unblock")}
					>
						Bỏ chặn
					</Button>
				)}
			</div>
		</motion.div>
	);
}
