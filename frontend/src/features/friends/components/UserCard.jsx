import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	ArrowUUpLeft,
	ChatCircle,
	Check,
	DotsThreeVertical,
	Prohibit,
	UserCirclePlus,
	UserMinus,
	UserPlus,
	X,
} from "@phosphor-icons/react";
import { Avatar, Card, IconButton, buttonClasses } from "../../../components/ui";
import { displayName } from "../../../lib/format";
import { cn } from "../../../lib/cn";

// One person in a relationship list. The action row is driven by `tab` so the
// same card serves every section (friends / requests / suggestions / blocked).
// Terminal actions call `onAction(type, item)` (page owns the API + optimistic
// removal); "Huỷ kết bạn" defers to a confirm modal via `onConfirmRemoveFriend`.
export default function UserCard({ item, tab, onAction, onConfirmRemoveFriend }) {
	const reduce = useReducedMotion();
	const [busy, setBusy] = useState(null); // action type currently in-flight
	const [following, setFollowing] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);

	const profile = item.profile;
	const name = displayName(profile);

	// Close the kebab menu when clicking anywhere else (toggle stops propagation).
	useEffect(() => {
		if (!menuOpen) return;
		const close = () => setMenuOpen(false);
		window.addEventListener("click", close);
		return () => window.removeEventListener("click", close);
	}, [menuOpen]);

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
		<Card
			as={motion.div}
			layout={!reduce}
			initial={reduce ? false : { opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
			className="flex flex-col items-center gap-4 p-4"
		>
			<Link
				to={`/profile/${item.userId}`}
				className="group flex w-full flex-col items-center gap-2 text-center"
			>
				<Avatar src={profile?.avatar} name={name} size="lg" />
				<div className="w-full">
					<p className="line-clamp-1 font-semibold text-zinc-900 transition-colors group-hover:text-brand-600 dark:text-zinc-100 dark:group-hover:text-brand-400">
						{name}
					</p>
					{profile?.username ? (
						<p className="line-clamp-1 text-xs text-zinc-500">@{profile.username}</p>
					) : (
						<p className="line-clamp-1 font-mono text-xs text-zinc-400">
							{item.userId?.slice(0, 8)}
						</p>
					)}
				</div>
			</Link>

			<div className="flex w-full items-center gap-2">
				{tab === "friends" && (
					<>
						<Link
							to="/messages"
							className={buttonClasses({
								variant: "secondary",
								size: "sm",
								className: "flex-1",
							})}
						>
							<ChatCircle size={16} weight="bold" />
							Nhắn tin
						</Link>
						<div className="relative">
							<IconButton
								label="Tuỳ chọn"
								className="h-9 w-9"
								onClick={(e) => {
									e.stopPropagation();
									setMenuOpen((v) => !v);
								}}
							>
								<DotsThreeVertical size={18} weight="bold" />
							</IconButton>
							<AnimatePresence>
								{menuOpen && (
									<motion.div
										initial={reduce ? false : { opacity: 0, scale: 0.95, y: -4 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.95, y: -4 }}
										transition={{ duration: 0.14 }}
										className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
									>
										<button
											type="button"
											onClick={() => {
												setMenuOpen(false);
												onConfirmRemoveFriend(item);
											}}
											className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
										>
											<UserMinus size={16} weight="bold" />
											Huỷ kết bạn
										</button>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</>
				)}

				{tab === "received" && (
					<>
						<button
							type="button"
							disabled={!!busy}
							onClick={() => run("accept")}
							className={buttonClasses({
								variant: "primary",
								size: "sm",
								className: "flex-1",
							})}
						>
							<Check size={16} weight="bold" />
							{busy === "accept" ? "Đang xử lý" : "Chấp nhận"}
						</button>
						<button
							type="button"
							disabled={!!busy}
							onClick={() => run("reject")}
							className={buttonClasses({
								variant: "outline",
								size: "sm",
								className: "flex-1",
							})}
						>
							<X size={16} weight="bold" />
							Từ chối
						</button>
					</>
				)}

				{tab === "sent" && (
					<button
						type="button"
						disabled={!!busy}
						onClick={() => run("cancel")}
						className={buttonClasses({
							variant: "outline",
							size: "sm",
							className: "w-full",
						})}
					>
						<ArrowUUpLeft size={16} weight="bold" />
						{busy === "cancel" ? "Đang thu hồi" : "Thu hồi lời mời"}
					</button>
				)}

				{tab === "suggested" && (
					<>
						<button
							type="button"
							disabled={!!busy}
							onClick={() => run("addFriend")}
							className={buttonClasses({
								variant: "primary",
								size: "sm",
								className: "flex-1",
							})}
						>
							<UserPlus size={16} weight="bold" />
							{busy === "addFriend" ? "Đang gửi" : "Kết bạn"}
						</button>
						<button
							type="button"
							disabled={!!busy}
							onClick={toggleFollow}
							className={buttonClasses({
								variant: following ? "secondary" : "outline",
								size: "sm",
								className: "flex-1",
							})}
						>
							{following ? (
								<Check size={16} weight="bold" />
							) : (
								<UserCirclePlus size={16} weight="bold" />
							)}
							{following ? "Đang theo dõi" : "Theo dõi"}
						</button>
					</>
				)}

				{tab === "blocked" && (
					<button
						type="button"
						disabled={!!busy}
						onClick={() => run("unblock")}
						className={cn(
							buttonClasses({ variant: "outline", size: "sm", className: "w-full" }),
						)}
					>
						<Prohibit size={16} weight="bold" />
						{busy === "unblock" ? "Đang bỏ chặn" : "Bỏ chặn"}
					</button>
				)}
			</div>
		</Card>
	);
}
