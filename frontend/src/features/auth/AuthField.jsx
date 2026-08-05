import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

// Ô nhập riêng cho màn đăng nhập / đăng ký. Instagram dùng field to và bo tròn
// hơn hẳn field trong app (48px / 12px so với 40px / 4px của components/ui/Input),
// nên tách hẳn một component thay vì ghi đè class — dự án không có tailwind-merge
// nên ghi đè `h-*`/`rounded-*` qua className là không chắc chắn.
const AuthField = forwardRef(function AuthField({ error, className, id, ...props }, ref) {
	const autoId = useId();
	const fieldId = id || autoId;
	return (
		<div className="flex flex-col gap-1">
			<input
				ref={ref}
				id={fieldId}
				className={cn(
					"h-12 w-full rounded-xl border bg-surface px-4 text-[15px] text-ink",
					"transition-colors placeholder:text-muted focus:border-muted",
					error ? "border-like" : "border-line",
					className,
				)}
				aria-invalid={!!error}
				{...props}
			/>
			{error && <p className="px-1 text-xs text-like">{error}</p>}
		</div>
	);
});

export default AuthField;
