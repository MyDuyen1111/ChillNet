import { cn } from "../../lib/cn";

// Instagram's icon buttons are bare glyphs: no background, no border. The only
// feedback is a dim on hover/press. Pass a Phosphor icon as child.
export default function IconButton({
	className,
	active = false,
	children,
	label,
	...props
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			className={cn(
				"inline-flex h-9 w-9 items-center justify-center rounded-full text-ink",
				"transition-opacity duration-100 hover:opacity-60 active:opacity-40",
				"disabled:pointer-events-none disabled:opacity-40",
				active && "text-accent",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
