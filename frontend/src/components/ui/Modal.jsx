import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

/**
 * Instagram dialog: 65% black scrim (no blur), 12px radius panel, a centred
 * semibold title on a hairline rule, and the close button parked in the
 * viewport corner rather than inside the panel.
 */
export default function Modal({
	open,
	onClose,
	title,
	children,
	className,
	bodyClassName = "p-4",
	size = "md",
}) {
	const reduce = useReducedMotion();

	useEffect(() => {
		if (!open) return;
		const onKey = (e) => e.key === "Escape" && onClose?.();
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	// `xl` dành cho dialog dạng 2 cột (ảnh trái + form phải) như trình soạn bài.
	const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-[860px]" };

	return createPortal(
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<motion.div
						className="absolute inset-0 bg-black/65"
						initial={reduce ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
					/>
					<button
						onClick={onClose}
						aria-label="Đóng"
						className="absolute right-4 top-4 z-10 text-white/90 transition-opacity hover:opacity-60"
					>
						<X size={24} />
					</button>
					<motion.div
						role="dialog"
						aria-modal="true"
						initial={reduce ? false : { opacity: 0, scale: 0.97 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className={cn(
							"relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-surface",
							widths[size],
							className,
						)}
					>
						{title && (
							<div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-2.5 text-center">
								<h2 className="text-base font-semibold text-ink">{title}</h2>
							</div>
						)}
						<div className={cn(bodyClassName)}>{children}</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
