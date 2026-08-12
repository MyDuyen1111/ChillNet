import { cn } from "../../../lib/cn";

// Pill trạng thái dùng chung cho hàng đợi kiểm duyệt, chi tiết hồ sơ và các màn
// của người dùng. `tone` là class Tailwind lấy từ bảng *_TONES trong constants.js.
export default function Badge({ tone, children, className }) {
	if (!children) return null;
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
				tone || "bg-fill text-muted",
				className,
			)}
		>
			{children}
		</span>
	);
}
