import { cn } from "../../lib/cn";

// Shape-matching placeholder. Compose several to mirror the final layout instead
// of showing a spinner.
export default function Skeleton({ className }) {
	return <div className={cn("animate-pulse rounded bg-fill", className)} />;
}
