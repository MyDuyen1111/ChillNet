import { User } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

const sizes = {
	xs: "h-6 w-6 text-[10px]",
	sm: "h-8 w-8 text-xs", // post header / comment
	md: "h-11 w-11 text-sm", // suggestion rows, list items
	lg: "h-14 w-14 text-base", // stories, conversation list
	xl: "h-[88px] w-[88px] text-2xl",
	"2xl": "h-[150px] w-[150px] text-4xl", // profile header
};

// Sizes for the silhouette shown when there is neither a photo nor a name.
const glyphSizes = { xs: 14, sm: 18, md: 24, lg: 30, xl: 48, "2xl": 80 };

function initials(name) {
	const parts = (name || "").trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return null;
	return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Circular avatar. `ring="story"` wraps it in Instagram's gradient story ring
 * with a canvas-coloured gap; `ring="seen"` is the flat grey "already viewed"
 * state. Photoless users fall back to monochrome initials, not a colour tint,
 * because Instagram keeps every chrome surface neutral. With no name either,
 * we show Instagram's grey silhouette rather than a "?", which reads as an
 * error instead of as "no photo yet".
 */
export default function Avatar({ src, name, size = "md", className, ring = false }) {
	const label = initials(name);
	const img = (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
				"bg-fill font-semibold text-muted",
				sizes[size],
				className,
			)}
		>
			{src ? (
				<img
					src={src}
					alt={name || "avatar"}
					className="h-full w-full object-cover"
					loading="lazy"
				/>
			) : label ? (
				label
			) : (
				<User size={glyphSizes[size]} weight="fill" className="text-faint" />
			)}
		</span>
	);

	if (!ring) return img;

	return (
		<span
			className={cn(
				"inline-flex shrink-0 rounded-full p-[2px]",
				ring === "seen" ? "bg-fill-strong" : "story-ring",
			)}
		>
			<span className="inline-flex rounded-full bg-canvas p-[2px]">{img}</span>
		</span>
	);
}
