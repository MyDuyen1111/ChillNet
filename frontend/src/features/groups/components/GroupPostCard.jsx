import { Heart, ChatCircle } from "@phosphor-icons/react";
import PostLink from "../../feed/components/PostLink";

// Ô vuông trong lưới bài viết của nhóm, giống lưới bài viết trang hồ sơ
// Instagram: ảnh phủ kín + hover lộ số thích/bình luận. Bài không có ảnh hiện
// trích đoạn nội dung trên nền phẳng.
export default function GroupPostCard({ post }) {
	const images = post.imageUrls ?? [];
	const image = images[0];

	return (
		<PostLink
			postId={post.id}
			className="group relative block aspect-square overflow-hidden bg-fill"
		>
			{image ? (
				<>
					<img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 bg-black/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
						<span className="flex items-center gap-1.5 text-sm font-semibold text-white">
							<Heart size={18} weight="fill" /> {post.likeCount ?? 0}
						</span>
						<span className="flex items-center gap-1.5 text-sm font-semibold text-white">
							<ChatCircle size={18} weight="fill" /> {post.commentCount ?? 0}
						</span>
					</div>
				</>
			) : (
				<p className="line-clamp-4 p-2 text-xs text-muted">{post.content || "Không có nội dung."}</p>
			)}
		</PostLink>
	);
}
