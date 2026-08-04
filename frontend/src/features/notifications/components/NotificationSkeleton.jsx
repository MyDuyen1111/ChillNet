import { Skeleton } from "../../../components/ui";

// Khớp hàng thật của NotificationItem: avatar tròn 44px + 2 dòng chữ + ô vuông
// 44px bên phải (chỗ nút Theo dõi / không gì cả khi render xong).
function Row() {
	return (
		<div className="flex items-center gap-3 px-2 py-2">
			<Skeleton className="h-11 w-11 shrink-0 rounded-full" />
			<div className="min-w-0 flex-1 space-y-2 py-0.5">
				<Skeleton className="h-3.5 w-4/5" />
				<Skeleton className="h-3.5 w-1/2" />
			</div>
			<Skeleton className="h-11 w-11 shrink-0 rounded" />
		</div>
	);
}

export default function NotificationSkeleton({ rows = 6 }) {
	return (
		<div>
			{Array.from({ length: rows }).map((_, i) => (
				<Row key={i} />
			))}
		</div>
	);
}
