import { Card, Skeleton } from "../../../components/ui";

// Mirrors the restyled PostCard (round header, square media, bare action row,
// two lines of caption) so the feed keeps its shape while loading.
export default function PostCardSkeleton({ withImage = true }) {
	return (
		<Card flush>
			<div className="flex items-center gap-3 p-3">
				<Skeleton className="h-8 w-8 rounded-full" />
				<div className="flex-1 space-y-1.5">
					<Skeleton className="h-3 w-28" />
					<Skeleton className="h-2.5 w-16" />
				</div>
			</div>

			{withImage && <Skeleton className="aspect-square w-full rounded-none" />}

			<div className="flex items-center gap-4 px-4 pt-3">
				<Skeleton className="h-6 w-6 rounded-full" />
				<Skeleton className="h-6 w-6 rounded-full" />
				<Skeleton className="h-6 w-6 rounded-full" />
			</div>

			<div className="space-y-2 px-4 py-3">
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-2/3" />
			</div>
		</Card>
	);
}
