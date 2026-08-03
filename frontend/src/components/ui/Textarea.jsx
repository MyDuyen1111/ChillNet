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
				<label
					htmlFor={areaId}
					className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
				>
					{label}
				</label>
			)}
			<textarea
				ref={ref}
				id={areaId}
				className={cn(
					"w-full resize-none rounded-xl border bg-white px-3.5 py-3 text-sm text-zinc-900 placeholder:text-zinc-400",
					"transition-colors focus:border-brand-500",
					"dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
					error
						? "border-rose-400 focus:border-rose-500"
						: "border-zinc-300 dark:border-zinc-700",
					className,
				)}
				aria-invalid={!!error}
				{...props}
			/>
			{error ? (
				<p className="text-xs text-rose-500">{error}</p>
			) : hint ? (
				<p className="text-xs text-zinc-500">{hint}</p>
			) : null}
		</div>
	);
});

export default Textarea;
