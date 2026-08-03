import { Skeleton } from "../../../components/ui";

// Skeleton row that mirrors NotificationItem's layout (icon chip + two text
// lines + timestamp) so the loading state does not shift when data arrives.
function Row() {
	return (
		<div className="flex items-start gap-3 px-4 py-3.5">
			<Skeleton className="h-10 w-10 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-2 py-0.5">
				<Skeleton className="h-3.5 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
				<Skeleton className="h-2.5 w-20" />
			</div>
		</div>
	);
}

export default function NotificationSkeleton({ rows = 6 }) {
	return (
		<div className="divide-y divide-zinc-100 dark:divide-zinc-800">
			{Array.from({ length: rows }).map((_, i) => (
				<Row key={i} />
			))}
		</div>
	);
}
