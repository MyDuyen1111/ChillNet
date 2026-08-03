import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

// Label ABOVE, error BELOW. Never placeholder-as-label.
const Input = forwardRef(function Input(
	{ label, error, hint, className, id, leftIcon, ...props },
	ref,
) {
	const autoId = useId();
	const inputId = id || autoId;
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<label
					htmlFor={inputId}
					className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
				>
					{label}
				</label>
			)}
			<div className="relative">
				{leftIcon && (
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
						{leftIcon}
					</span>
				)}
				<input
					ref={ref}
					id={inputId}
					className={cn(
						"h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400",
						"transition-colors focus:border-brand-500",
						"dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
						leftIcon && "pl-10",
						error
							? "border-rose-400 focus:border-rose-500"
							: "border-zinc-300 dark:border-zinc-700",
						className,
					)}
					aria-invalid={!!error}
					{...props}
				/>
			</div>
			{error ? (
				<p className="text-xs text-rose-500">{error}</p>
			) : hint ? (
				<p className="text-xs text-zinc-500">{hint}</p>
			) : null}
		</div>
	);
});

export default Input;
