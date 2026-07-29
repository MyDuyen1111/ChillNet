import { cn } from "../../lib/cn";
import Spinner from "./Spinner";

// Instagram's button language: compact (32px default), semibold 14px, 8px
// radius, no shadow, no scale-on-press. Only two real weights exist, the blue
// primary and the neutral grey secondary. Everything else is a text link.
const variants = {
	primary: "bg-accent text-white hover:bg-accent-hover disabled:opacity-30",
	secondary: "bg-fill text-ink hover:bg-fill-strong",
	ghost: "bg-transparent text-ink hover:bg-hover",
	outline: "border border-line text-ink hover:bg-hover",
	// Blue text button: "Theo dõi", "Xem tất cả". Instagram's third weight.
	link: "bg-transparent text-accent hover:text-accent-strong disabled:opacity-40 dark:hover:text-white",
	danger: "bg-like text-white hover:opacity-90",
};

const sizes = {
	sm: "h-7 px-3 text-xs gap-1.5",
	md: "h-8 px-4 text-sm gap-1.5",
	lg: "h-11 px-6 text-sm gap-2",
	icon: "h-8 w-8",
};

// `link` has no box, so it must not carry the box paddings/heights.
const linkSizes = {
	sm: "text-xs gap-1",
	md: "text-sm gap-1",
	lg: "text-sm gap-1.5",
	icon: "",
};

// Reusable class string so <Link> can look like a button too.
export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
	return cn(
		"inline-flex items-center justify-center rounded-lg font-semibold transition-colors duration-100",
		"disabled:pointer-events-none disabled:opacity-40",
		variants[variant],
		variant === "link" ? linkSizes[size] : sizes[size],
		className,
	);
}

export default function Button({
	variant = "primary",
	size = "md",
	loading = false,
	disabled,
	className,
	children,
	...props
}) {
	return (
		<button
			className={buttonClasses({ variant, size, className })}
			disabled={disabled || loading}
			{...props}
		>
			{loading && <Spinner size={16} />}
			{children}
		</button>
	);
}
