import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { UserPlus, SignOut, Crown, Clock } from "@phosphor-icons/react";
import { Card, Avatar, Button } from "../../../components/ui";
import { coverUrl, privacyMeta, isMemberOf, isOwner, memberCountLabel } from "../groupUtils";

// Thẻ nhóm cho lưới. Cả thẻ điều hướng tới /groups/:id (dùng navigate để tránh
// lồng <button> trong <a>); nút hành động chặn nổi bọt sự kiện.
export default function GroupCard({ group, currentUserId, pending, busy, onJoin, onLeave }) {
	const navigate = useNavigate();
	const reduce = useReducedMotion();
	const owner = isOwner(group, currentUserId);
	const member = isMemberOf(group);
	const privacy = privacyMeta(group.privacy);
	const PrivacyIcon = privacy.Icon;

	const go = () => navigate(`/groups/${group.id}`);
	const stop = (fn) => (e) => {
		e.stopPropagation();
		fn?.();
	};

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25 }}
			whileHover={reduce ? undefined : { y: -3 }}
		>
			<Card
				role="link"
				tabIndex={0}
				onClick={go}
				onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), go())}
				aria-label={`Xem nhóm ${group.name}`}
				className="cursor-pointer overflow-hidden outline-none transition-shadow hover:shadow-lg hover:shadow-zinc-900/5 focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:shadow-black/20"
			>
				<div className="relative h-24 w-full bg-zinc-100 dark:bg-zinc-800">
					<img src={coverUrl(group)} alt="" className="h-full w-full object-cover" loading="lazy" />
					<span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-zinc-950/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
						<PrivacyIcon size={12} weight="bold" />
						{privacy.label}
					</span>
				</div>

				<div className="p-4 pt-0">
					<div className="-mt-6 mb-2">
						<Avatar
							src={group.avatarUrl}
							name={group.name}
							size="lg"
							ring
							className="border border-white dark:border-zinc-900"
						/>
					</div>

					<h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
						{group.name}
					</h3>
					<p className="mt-0.5 font-mono text-xs text-zinc-500">
						{memberCountLabel(group.memberCount)}
					</p>

					{group.description ? (
						<p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
							{group.description}
						</p>
					) : (
						<p className="mt-2 line-clamp-2 text-sm italic text-zinc-400">Chưa có mô tả.</p>
					)}

					<div className="mt-4">
						{owner ? (
							<span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
								<Crown size={14} weight="fill" /> Chủ nhóm
							</span>
						) : member ? (
							<Button
								variant="outline"
								size="sm"
								loading={busy}
								onClick={stop(onLeave)}
								className="w-full"
							>
								<SignOut size={16} /> Rời nhóm
							</Button>
						) : pending ? (
							<Button
								variant="secondary"
								size="sm"
								disabled
								onClick={stop()}
								className="w-full"
							>
								<Clock size={16} /> Đã gửi yêu cầu
							</Button>
						) : (
							<Button
								variant="primary"
								size="sm"
								loading={busy}
								onClick={stop(onJoin)}
								className="w-full"
							>
								<UserPlus size={16} /> Tham gia
							</Button>
						)}
					</div>
				</div>
			</Card>
		</motion.div>
	);
}
