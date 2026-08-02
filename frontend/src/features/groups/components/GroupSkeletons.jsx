import { Skeleton } from "../../../components/ui";

// Ô vuông khớp GroupCard / GroupPostCard (lưới kiểu Explore / profile Instagram).
export function GroupCardSkeleton() {
	return <Skeleton className="aspect-square w-full rounded-none" />;
}

export function GroupGridSkeleton({ count = 6 }) {
	return (
		<div className="grid grid-cols-2 gap-1 md:grid-cols-3">
			{Array.from({ length: count }).map((_, i) => (
				<GroupCardSkeleton key={i} />
			))}
		</div>
	);
}

// Lưới bài viết trong nhóm (3 cột, khớp GroupPostCard).
export function PostGridSkeleton({ count = 9 }) {
	return (
		<div className="grid grid-cols-3 gap-1">
			{Array.from({ length: count }).map((_, i) => (
				<Skeleton key={i} className="aspect-square w-full rounded-none" />
			))}
		</div>
	);
}

// Hàng phẳng khớp MemberRow / JoinRequestRow.
export function RowSkeleton() {
	return (
		<div className="flex items-center gap-3 py-2">
			<Skeleton className="h-11 w-11 rounded-full" />
			<div className="flex-1 space-y-1.5">
				<Skeleton className="h-3.5 w-1/3" />
				<Skeleton className="h-3 w-1/4" />
			</div>
			<Skeleton className="h-7 w-16 rounded-lg" />
		</div>
	);
}

export function RowsSkeleton({ count = 5 }) {
	return (
		<div className="divide-y divide-line-soft">
			{Array.from({ length: count }).map((_, i) => (
				<RowSkeleton key={i} />
			))}
		</div>
	);
}
