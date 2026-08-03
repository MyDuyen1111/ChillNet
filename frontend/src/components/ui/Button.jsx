import { cn } from "../../lib/cn";
import Spinner from "./Spinner";

// Shape lock: buttons + inputs use rounded-xl; cards rounded-2xl; avatars/pills full.
// Accent lock: brand (teal). Never introduce a second accent.
const variants = {
	primary:
		"bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm shadow-brand-600/20",
	secondary:
		"bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
	ghost:
		"bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
	outline:
		"border border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800",
	danger:
		"bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm shadow-rose-600/20",
};

const sizes = {
	sm: "h-9 px-3 text-sm gap-1.5",
	md: "h-11 px-4 text-sm gap-2",
	lg: "h-12 px-6 text-base gap-2",
	icon: "h-11 w-11",
};

// Reusable class string so <Link> can look like a button too.
export function buttonClasses({ variant = "primary", size = "md", className } = {}) {
	return cn(
		"inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150",
		"active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
		variants[variant],
		sizes[size],
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
