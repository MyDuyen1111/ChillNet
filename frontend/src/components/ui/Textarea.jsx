import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

const Textarea = forwardRef(function Textarea(
	{ label, error, hint, className, id, ...props },
	ref,
) {
	const autoId = useId();
	const areaId = id || autoId;
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<label htmlFor={areaId} className="text-sm font-semibold text-ink">
					{label}
				</label>
			)}
			<textarea
				ref={ref}
				id={areaId}
				className={cn(
					"w-full resize-none rounded border bg-canvas px-3 py-2.5 text-sm text-ink placeholder:text-muted",
					"transition-colors focus:border-muted",
					error ? "border-like" : "border-line",
					className,
				)}
				aria-invalid={!!error}
				{...props}
			/>
			{error ? (
				<p className="text-xs text-like">{error}</p>
			) : hint ? (
				<p className="text-xs text-muted">{hint}</p>
			) : null}
		</div>
	);
});

export default Textarea;
