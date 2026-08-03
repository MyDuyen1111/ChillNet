import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";

// Full-screen image viewer with keyboard + on-screen navigation. Lives in the
// feature folder (the shared Modal is content-sized, not built for media).
export default function ImageLightbox({ images = [], index = 0, onClose, onIndexChange }) {
	const reduce = useReducedMotion();
	const open = index != null && index >= 0;
	const total = images.length;

	const go = (delta) => {
		if (!total) return;
		onIndexChange?.((index + delta + total) % total);
	};

	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === "Escape") onClose?.();
			if (e.key === "ArrowRight") go(1);
			if (e.key === "ArrowLeft") go(-1);
		};
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, index, total]);

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/90 p-4"
					initial={reduce ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={onClose}
				>
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng"
						className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
					>
						<X size={22} />
					</button>

					{total > 1 && (
						<>
							<button
								type="button"
								aria-label="Ảnh trước"
								onClick={(e) => {
									e.stopPropagation();
									go(-1);
								}}
								className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
							>
								<CaretLeft size={24} />
							</button>
							<button
								type="button"
								aria-label="Ảnh sau"
								onClick={(e) => {
									e.stopPropagation();
									go(1);
								}}
								className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
							>
								<CaretRight size={24} />
							</button>
						</>
					)}

					<motion.img
						key={index}
						src={images[index]}
						alt={`Ảnh ${index + 1}`}
						onClick={(e) => e.stopPropagation()}
						initial={reduce ? false : { opacity: 0, scale: 0.97 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ type: "spring", stiffness: 260, damping: 26 }}
						className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
					/>

					{total > 1 && (
						<span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white">
							{index + 1} / {total}
						</span>
					)}
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
