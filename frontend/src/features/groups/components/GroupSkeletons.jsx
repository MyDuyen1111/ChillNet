import { Card, Skeleton } from "../../../components/ui";

// Skeleton khớp layout GroupCard (không dùng spinner tràn màn).
export function GroupCardSkeleton() {
	return (
		<Card className="overflow-hidden">
			<Skeleton className="h-24 w-full rounded-none" />
			<div className="p-4 pt-0">
				<div className="-mt-6 mb-3">
					<Skeleton className="h-14 w-14 rounded-full" />
				</div>
				<Skeleton className="h-4 w-2/3" />
				<Skeleton className="mt-2 h-3 w-1/3" />
				<Skeleton className="mt-3 h-3 w-full" />
				<Skeleton className="mt-2 h-3 w-4/5" />
				<Skeleton className="mt-4 h-9 w-full rounded-xl" />
			</div>
		</Card>
	);
}

export function GroupGridSkeleton({ count = 3 }) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: count }).map((_, i) => (
				<GroupCardSkeleton key={i} />
			))}
		</div>
	);
}

export function RowSkeleton() {
	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<Skeleton className="h-10 w-10 rounded-full" />
			<div className="flex-1">
				<Skeleton className="h-3.5 w-1/3" />
				<Skeleton className="mt-2 h-3 w-1/4" />
			</div>
			<Skeleton className="h-6 w-20 rounded-full" />
		</div>
	);
}

export function RowsSkeleton({ count = 5 }) {
	return (
		<div className="divide-y divide-zinc-100 dark:divide-zinc-800">
			{Array.from({ length: count }).map((_, i) => (
				<RowSkeleton key={i} />
			))}
		</div>
	);
}
