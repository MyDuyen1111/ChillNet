import { cn } from "../../lib/cn";

// Neutral surface. Use only when elevation communicates real grouping; otherwise
// separate with spacing or a divide-y.
export default function Card({ className, children, as: Tag = "div", ...props }) {
	return (
		<Tag
			className={cn(
				"rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
				className,
			)}
			{...props}
		>
			{children}
		</Tag>
	);
}
