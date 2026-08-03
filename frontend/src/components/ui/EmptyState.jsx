import { cn } from "../../lib/cn";

// Composed empty state: icon + title + description + optional action.
export default function EmptyState({ icon: Icon, title, description, action, className }) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
				className,
			)}
		>
			{Icon && (
				<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
					<Icon size={26} />
				</span>
			)}
			<div className="space-y-1">
				<h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
					{title}
				</h3>
				{description && (
					<p className="mx-auto max-w-sm text-sm text-zinc-500">{description}</p>
				)}
			</div>
			{action}
		</div>
	);
}
