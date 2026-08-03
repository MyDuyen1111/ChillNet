import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

// Accessible modal: Escape + overlay click close, scroll lock, motion-in.
export default function Modal({ open, onClose, title, children, className, size = "md" }) {
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

	const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

	return createPortal(
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<motion.div
						className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
						initial={reduce ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
					/>
					<motion.div
						role="dialog"
						aria-modal="true"
						initial={reduce ? false : { opacity: 0, scale: 0.96, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.98, y: 8 }}
						transition={{ type: "spring", stiffness: 260, damping: 24 }}
						className={cn(
							"relative w-full rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900",
							widths[size],
							className,
						)}
					>
						{title && (
							<div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
								<h2 className="text-base font-semibold">{title}</h2>
								<button
									onClick={onClose}
									aria-label="Đóng"
									className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
								>
									<X size={18} />
								</button>
							</div>
						)}
						<div className="p-5">{children}</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
