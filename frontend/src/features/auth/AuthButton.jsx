import Spinner from "../../components/ui/Spinner";
import { cn } from "../../lib/cn";

// Nút của màn đăng nhập / đăng ký: cao 48px, bo 12px, chiếm trọn chiều ngang —
// khác hẳn nút 32px trong app, nên không dùng lại components/ui/Button.
const variants = {
	// Khi form chưa đủ dữ liệu, Instagram làm mờ nút xanh chứ không đổi sang xám.
	primary: "bg-accent text-white hover:bg-accent-hover disabled:bg-accent/40",
	outline: "border border-line text-ink hover:bg-hover",
	accent: "border border-accent/50 text-accent hover:bg-accent/5",
};

export default function AuthButton({
	as: Tag = "button",
	variant = "primary",
	loading = false,
	disabled,
	className,
	children,
	...props
}) {
	const isButton = Tag === "button";
	return (
		<Tag
			className={cn(
				"inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl",
				"text-[15px] font-semibold transition-colors duration-100",
				"disabled:pointer-events-none",
				variants[variant],
				className,
			)}
			{...(isButton ? { type: props.type || "button", disabled: disabled || loading } : {})}
			{...props}
		>
			{loading && <Spinner size={16} />}
			{children}
		</Tag>
	);
}
