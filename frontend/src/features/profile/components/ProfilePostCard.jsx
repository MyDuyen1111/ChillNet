import { useState } from "react";
import { motion } from "motion/react";
import { ChatCircle, Heart, ShareFat } from "@phosphor-icons/react";
import { Avatar, Card } from "../../../components/ui";
import { timeAgo } from "../../../lib/format";

// A deliberately minimal post card, local to the profile feature so it never
// depends on the feed module. Read-only: it shows content, images and counts.
export default function ProfilePostCard({ post, authorName, authorAvatar }) {
	const [broken, setBroken] = useState({});

	const name = post.username || authorName || "Người dùng";
	const avatar = post.userAvatar || authorAvatar;
	const when = post.createdDate || post.created;
	const images = (post.imageUrls || []).filter(Boolean);

	return (
		<Card as={motion.article} className="overflow-hidden">
			<header className="flex items-center gap-3 px-4 pt-4">
				<Avatar src={avatar} name={name} size="md" />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
						{name}
					</p>
					<p className="text-xs text-zinc-500">{timeAgo(when)}</p>
				</div>
			</header>

			{post.content && (
				<p className="whitespace-pre-wrap px-4 pt-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
					{post.content}
				</p>
			)}

			{images.length > 0 && (
				<div
					className={`mt-3 grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
				>
					{images.slice(0, 4).map((url, i) =>
						broken[i] ? null : (
							<div
								key={url + i}
								className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800"
							>
								<img
									src={url}
									alt="Ảnh bài viết"
									loading="lazy"
									onError={() => setBroken((b) => ({ ...b, [i]: true }))}
									className="h-full w-full object-cover"
								/>
								{i === 3 && images.length > 4 && (
									<div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 text-lg font-semibold text-white">
										+{images.length - 4}
									</div>
								)}
							</div>
						),
					)}
				</div>
			)}

			<footer className="flex items-center gap-5 px-4 py-3 text-sm text-zinc-500">
				<span className="inline-flex items-center gap-1.5">
					<Heart size={18} weight={post.isLiked ? "fill" : "regular"} className={post.isLiked ? "text-rose-500" : ""} />
					<span className="font-mono tabular-nums">{post.likeCount ?? 0}</span>
				</span>
				<span className="inline-flex items-center gap-1.5">
					<ChatCircle size={18} />
					<span className="font-mono tabular-nums">{post.commentCount ?? 0}</span>
				</span>
				<span className="inline-flex items-center gap-1.5">
					<ShareFat size={18} />
					<span className="font-mono tabular-nums">{post.shareCount ?? 0}</span>
				</span>
			</footer>
		</Card>
	);
}
