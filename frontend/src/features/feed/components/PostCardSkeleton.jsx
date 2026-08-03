import { Card, Skeleton } from "../../../components/ui";

// Mirrors the PostCard layout (header, text, media, action bar) so the feed
// keeps its shape while loading instead of flashing a spinner.
export default function PostCardSkeleton({ withImage = true }) {
	return (
		<Card className="p-4">
			<div className="flex items-center gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-3.5 w-32" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>
			<div className="mt-4 space-y-2">
				<Skeleton className="h-3.5 w-full" />
				<Skeleton className="h-3.5 w-4/5" />
			</div>
			{withImage && <Skeleton className="mt-4 h-56 w-full rounded-2xl" />}
			<div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
				<Skeleton className="h-8 flex-1" />
				<Skeleton className="h-8 flex-1" />
				<Skeleton className="h-8 flex-1" />
			</div>
		</Card>
	);
}
