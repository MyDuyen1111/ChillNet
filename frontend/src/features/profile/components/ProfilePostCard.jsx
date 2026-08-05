import { useState } from "react";
import { ChatCircle, Heart } from "@phosphor-icons/react";
import PostLink from "../../feed/components/PostLink";

// A single square tile in the profile's 3-column grid, Instagram-style: cover
// image (or a text excerpt when the post has none), with like/comment counts
// revealed on hover. Clicking opens the full post.
export default function ProfilePostCard({ post }) {
	const [broken, setBroken] = useState(false);
	const images = (post.imageUrls || []).filter(Boolean);
	const cover = images[0];
	const showImage = cover && !broken;

	return (
		<PostLink
			postId={post.id}
			className="group relative block aspect-square overflow-hidden bg-fill"
		>
			{showImage ? (
				<img
					src={cover}
					alt="Ảnh bài viết"
					loading="lazy"
					onError={() => setBroken(true)}
					className="h-full w-full object-cover"
				/>
			) : (
				// Instagram never has a photoless tile, so there is no reference to copy.
				// Treating the caption as the artwork (centred, large, clamped) reads as a
				// deliberate text post instead of an image that failed to load.
				<div className="flex h-full w-full items-center justify-center p-4 sm:p-5">
					<p className="line-clamp-5 text-center text-sm font-medium leading-snug text-ink">
						{post.content || (
							<span className="font-normal text-muted">Bài viết không có nội dung</span>
						)}
					</p>
				</div>
			)}

			<div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
				<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
					<Heart size={18} weight="fill" />
					{post.likeCount ?? 0}
				</span>
				<span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
					<ChatCircle size={18} weight="fill" />
					{post.commentCount ?? 0}
				</span>
			</div>
		</PostLink>
	);
}
