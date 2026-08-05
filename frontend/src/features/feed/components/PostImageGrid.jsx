import { useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "../../../lib/cn";

// Instagram's post media: a single scroll-snap carousel (never a mosaic), full
// bleed inside the card, with dot indicators and hover arrows for multi-image
// posts. `variant="detail"` swaps the square feed crop for a letterboxed,
// object-contain view against a black backdrop for the post-detail column.
export default function PostImageGrid({ images = [], onOpen, variant = "feed" }) {
	const scrollRef = useRef(null);
	const [active, setActive] = useState(0);

	if (!images.length) return null;

	const multi = images.length > 1;

	const scrollTo = (i) => {
		const el = scrollRef.current;
		if (!el) return;
		el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
	};

	const onScroll = () => {
		const el = scrollRef.current;
		if (!el || !el.clientWidth) return;
		setActive(Math.round(el.scrollLeft / el.clientWidth));
	};

	const go = (delta) => {
		const next = (active + delta + images.length) % images.length;
		setActive(next);
		scrollTo(next);
	};

	const isDetail = variant === "detail";

	return (
		<div
			className={cn(
				"group relative w-full overflow-hidden",
				isDetail ? "h-full bg-black" : "aspect-square bg-fill",
			)}
		>
			<div
				ref={scrollRef}
				onScroll={onScroll}
				// scrollbarWidth để inline: rule `* { scrollbar-width: thin }` trong
				// index.css áp cho mọi phần tử, và class utility thỉnh thoảng vẫn thua
				// tuỳ thứ tự — inline style thì chắc chắn thắng ở cả Chrome lẫn Firefox.
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
				className={cn(
					"flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
					isDetail ? "h-full items-center" : "h-full",
				)}
			>
				{images.map((url, i) =>
					onOpen ? (
						<button
							type="button"
							key={`${url}-${i}`}
							onClick={() => onOpen(i)}
							className="h-full w-full shrink-0 snap-center"
						>
							<img
								src={url}
								alt={`Ảnh bài viết ${i + 1}`}
								loading="lazy"
								className={cn(
									"h-full w-full",
									isDetail ? "object-contain" : "object-cover",
								)}
							/>
						</button>
					) : (
						<div key={`${url}-${i}`} className="h-full w-full shrink-0 snap-center">
							<img
								src={url}
								alt={`Ảnh bài viết ${i + 1}`}
								loading="lazy"
								className={cn(
									"h-full w-full",
									isDetail ? "object-contain" : "object-cover",
								)}
							/>
						</div>
					),
				)}
			</div>

			{multi && (
				<>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							go(-1);
						}}
						aria-label="Ảnh trước"
						className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-1 text-[#000] opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
					>
						<CaretLeft size={18} weight="bold" />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							go(1);
						}}
						aria-label="Ảnh sau"
						className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-1 text-[#000] opacity-0 transition-opacity group-hover:opacity-100 sm:flex"
					>
						<CaretRight size={18} weight="bold" />
					</button>
					<div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
						{images.map((_, i) => (
							<span
								key={i}
								className={cn(
									"h-1.5 w-1.5 rounded-full transition-colors",
									i === active ? "bg-accent" : "bg-white/70",
								)}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
}
