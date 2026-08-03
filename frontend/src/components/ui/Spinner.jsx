import { cn } from "../../lib/cn";

// Minimal spinner. Prefer <Skeleton> for content placeholders; use this only
// for inline/button loading.
export default function Spinner({ size = 20, className }) {
	return (
		<svg
			className={cn("animate-spin text-current", className)}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				className="opacity-20"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="3"
			/>
			<path
				className="opacity-90"
				d="M22 12a10 10 0 0 1-10 10"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
		</svg>
	);
}
