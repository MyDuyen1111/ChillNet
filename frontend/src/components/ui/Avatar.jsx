import { cn } from "../../lib/cn";

const sizes = {
	xs: "h-6 w-6 text-[10px]",
	sm: "h-8 w-8 text-xs",
	md: "h-10 w-10 text-sm",
	lg: "h-14 w-14 text-lg",
	xl: "h-24 w-24 text-3xl",
};

function initials(name) {
	if (!name) return "?";
	const parts = name.trim().split(/\s+/);
	return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Deterministic tint from the name so avatars without a photo stay stable and
// distinct (still within the neutral+brand family).
const tints = [
	"bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
	"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
	"bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
	"bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
	"bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
];

export default function Avatar({ src, name, size = "md", className, ring = false }) {
	const tint = tints[(name?.length ?? 0) % tints.length];
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
				sizes[size],
				!src && tint,
				ring && "ring-2 ring-white dark:ring-zinc-900",
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
			) : (
				initials(name)
			)}
		</span>
	);
}
