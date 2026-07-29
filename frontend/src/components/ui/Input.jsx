import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

// Instagram's field: tinted fill, hairline border, small radius, 14px text. The
// label sits above (Instagram floats it inside, but an explicit label matches
// the settings screens and is better for a11y).
const Input = forwardRef(function Input(
	{ label, error, hint, className, id, leftIcon, ...props },
	ref,
) {
	const autoId = useId();
	const inputId = id || autoId;
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<label htmlFor={inputId} className="text-sm font-semibold text-ink">
					{label}
				</label>
			)}
			<div className="relative">
				{leftIcon && (
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
						{leftIcon}
					</span>
				)}
				<input
					ref={ref}
					id={inputId}
					className={cn(
						"h-10 w-full rounded border bg-canvas px-3 text-sm text-ink placeholder:text-muted",
						"transition-colors focus:border-muted",
						leftIcon && "pl-10",
						error ? "border-like" : "border-line",
						className,
					)}
					aria-invalid={!!error}
					{...props}
				/>
			</div>
			{error ? (
				<p className="text-xs text-like">{error}</p>
			) : hint ? (
				<p className="text-xs text-muted">{hint}</p>
			) : null}
		</div>
	);
});

export default Input;
