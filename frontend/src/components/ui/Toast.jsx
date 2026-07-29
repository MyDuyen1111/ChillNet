import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/cn";

const ToastContext = createContext(null);

/**
 * Instagram's toast is a single dark pill that rises from the bottom centre,
 * text only, no icon and no colour coding. Errors get a red hairline so they
 * still read as failures without breaking the monochrome chrome.
 */
export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);
	const seq = useRef(0);

	const dismiss = useCallback((id) => {
		setToasts((list) => list.filter((t) => t.id !== id));
	}, []);

	const toast = useCallback(
		(message, { type = "info", duration = 3500 } = {}) => {
			const id = ++seq.current;
			setToasts((list) => [...list, { id, message, type }]);
			if (duration) setTimeout(() => dismiss(id), duration);
			return id;
		},
		[dismiss],
	);

	// Convenience helpers.
	toast.success = (m, o) => toast(m, { ...o, type: "success" });
	toast.error = (m, o) => toast(m, { ...o, type: "error" });

	return (
		<ToastContext.Provider value={toast}>
			{children}
			{createPortal(
				<div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-8">
					<AnimatePresence>
						{toasts.map(({ id, message, type }) => (
							<motion.button
								key={id}
								layout
								onClick={() => dismiss(id)}
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 8 }}
								transition={{ duration: 0.18, ease: "easeOut" }}
								className={cn(
									"pointer-events-auto max-w-sm rounded-lg bg-[#262626] px-4 py-3 text-sm text-white shadow-lg",
									type === "error" && "border border-like",
								)}
							>
								{message}
							</motion.button>
						))}
					</AnimatePresence>
				</div>,
				document.body,
			)}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
	return ctx;
}
