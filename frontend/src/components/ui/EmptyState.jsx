import { cn } from "../../lib/cn";

/**
 * Instagram's empty state: a thin-outlined circle holding a light-weight icon,
 * a large light headline, and one line of muted copy. No filled tiles, no
 * colour.
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
				className,
			)}
		>
			{Icon && (
				<span className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-ink text-ink">
					<Icon size={30} weight="light" />
				</span>
			)}
			<div className="space-y-1.5">
				<h3 className="text-[22px] font-light leading-tight text-ink">{title}</h3>
				{description && (
					<p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
				)}
			</div>
			{action}
		</div>
	);
}
