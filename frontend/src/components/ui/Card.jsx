import { cn } from "../../lib/cn";

/**
 * Instagram surface: flat white (black in dark), one hairline border, small
 * radius, never a shadow. `flush` drops the border and radius below `sm` so
 * feed posts run edge-to-edge on phones, exactly like the real app.
 */
export default function Card({
	className,
	children,
	flush = false,
	as: Tag = "div",
	...props
}) {
	return (
		<Tag
			className={cn(
				"bg-surface",
				flush
					? "border-y border-line sm:rounded-lg sm:border-x"
					: "rounded-lg border border-line",
				className,
			)}
			{...props}
		>
			{children}
		</Tag>
	);
}
