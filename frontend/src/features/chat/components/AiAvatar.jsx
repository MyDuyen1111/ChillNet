import { Sparkle } from "@phosphor-icons/react";
import { cn } from "../../../lib/cn";

// Distinct gradient avatar for the "ChillNet AI" assistant so it reads as a bot,
// not a person. Sizes mirror the shared <Avatar/> (sm/md/lg).
const SIZES = {
	sm: { box: "h-8 w-8", icon: 14 },
	md: { box: "h-10 w-10", icon: 18 },
	lg: { box: "h-12 w-12", icon: 22 },
};

export default function AiAvatar({ size = "md", className }) {
	const s = SIZES[size] ?? SIZES.md;
	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 via-brand-500 to-violet-500 text-white shadow-sm",
				s.box,
				className,
			)}
			aria-label="ChillNet AI"
		>
			<Sparkle size={s.icon} weight="fill" />
		</span>
	);
}
