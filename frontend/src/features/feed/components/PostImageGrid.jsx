import { cn } from "../../../lib/cn";

// Responsive 1-4 image mosaic. Corners are clipped by the rounded container so
// the inner tiles butt together like a gallery. A 5th+ image collapses into a
// "+N" overlay on the last visible tile.
export default function PostImageGrid({ images = [], onOpen }) {
	if (!images.length) return null;

	const shown = images.slice(0, 4);
	const extra = images.length - shown.length;
	const count = shown.length;

	const cellBase =
		"group relative block h-full w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800";

	return (
		<div
			className={cn(
				"grid gap-1 overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10",
				count === 1 && "grid-cols-1",
				count === 2 && "grid-cols-2",
				count === 3 && "h-80 grid-cols-2 grid-rows-2",
				count === 4 && "grid-cols-2",
			)}
		>
			{shown.map((url, i) => (
				<button
					type="button"
					key={`${url}-${i}`}
					onClick={() => onOpen?.(i)}
					className={cn(
						cellBase,
						count === 1 && "max-h-[34rem]",
						count === 3 && i === 0 && "row-span-2",
					)}
				>
					<img
						src={url}
						alt={`Ảnh bài viết ${i + 1}`}
						loading="lazy"
						className={cn(
							"h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]",
							count === 1 && "max-h-[34rem]",
							count === 2 && "aspect-square",
							count === 4 && "aspect-square",
						)}
					/>
					{extra > 0 && i === shown.length - 1 && (
						<span className="absolute inset-0 flex items-center justify-center bg-zinc-950/55 text-2xl font-semibold text-white">
							+{extra}
						</span>
					)}
				</button>
			))}
		</div>
	);
}
