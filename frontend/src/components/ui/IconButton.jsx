import { cn } from "../../lib/cn";

// Round, icon-only button for toolbars and cards. Pass a Phosphor icon as child.
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
				"inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition-all duration-150",
				"hover:bg-zinc-100 hover:text-zinc-900 active:scale-95",
				"dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
				active && "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
