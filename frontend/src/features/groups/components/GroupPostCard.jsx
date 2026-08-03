import { Link } from "react-router-dom";
import { Heart, ChatCircle } from "@phosphor-icons/react";
import { Card, Avatar } from "../../../components/ui";
import { timeAgo } from "../../../lib/format";
import { relTime } from "../groupUtils";

// Render gọn 1 bài viết trong nhóm (KHÔNG dùng component của feature feed).
export default function GroupPostCard({ post }) {
	const when = timeAgo(post.createdDate) || relTime(post.created);
	const images = post.imageUrls ?? [];

	return (
		<Card className="p-4">
			<div className="flex items-center gap-3">
				<Link to={`/profile/${post.userId}`} className="shrink-0">
					<Avatar src={post.userAvatar} name={post.username} size="md" />
				</Link>
				<div className="min-w-0">
					<Link
						to={`/profile/${post.userId}`}
						className="block truncate text-sm font-semibold text-zinc-900 hover:text-brand-600 dark:text-zinc-100 dark:hover:text-brand-400"
					>
						{post.username || "Người dùng"}
					</Link>
					{when && <p className="truncate text-xs text-zinc-500">{when}</p>}
				</div>
			</div>

			{post.content && (
				<p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-200">
					{post.content}
				</p>
			)}

			{images.length > 0 && (
				<div
					className={`mt-3 grid gap-1.5 overflow-hidden rounded-xl ${
						images.length === 1 ? "grid-cols-1" : "grid-cols-2"
					}`}
				>
					{images.slice(0, 4).map((url, i) => (
						<div key={i} className="relative">
							<img
								src={url}
								alt=""
								loading="lazy"
								className="h-40 w-full object-cover"
							/>
							{i === 3 && images.length > 4 && (
								<span className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 text-lg font-semibold text-white">
									+{images.length - 4}
								</span>
							)}
						</div>
					))}
				</div>
			)}

			<div className="mt-3 flex items-center gap-5 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
				<span className="inline-flex items-center gap-1.5">
					<Heart size={16} weight={post.isLiked ? "fill" : "regular"} className={post.isLiked ? "text-rose-500" : ""} />
					{post.likeCount ?? 0}
				</span>
				<span className="inline-flex items-center gap-1.5">
					<ChatCircle size={16} />
					{post.commentCount ?? 0}
				</span>
			</div>
		</Card>
	);
}
