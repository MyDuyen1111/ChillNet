import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import { cn } from "../../lib/cn";

const ToastContext = createContext(null);

const icons = {
	success: { Icon: CheckCircle, tint: "text-brand-500" },
	error: { Icon: WarningCircle, tint: "text-rose-500" },
	info: { Icon: Info, tint: "text-sky-500" },
};

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
				<div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
					<AnimatePresence>
						{toasts.map(({ id, message, type }) => {
							const { Icon, tint } = icons[type] || icons.info;
							return (
								<motion.div
									key={id}
									layout
									initial={{ opacity: 0, x: 40, scale: 0.9 }}
									animate={{ opacity: 1, x: 0, scale: 1 }}
									exit={{ opacity: 0, x: 40, scale: 0.9 }}
									transition={{ type: "spring", stiffness: 320, damping: 28 }}
									className={cn(
										"flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-lg",
										"dark:border-zinc-800 dark:bg-zinc-900",
									)}
								>
									<Icon size={20} className={tint} weight="fill" />
									<span className="max-w-xs text-sm text-zinc-800 dark:text-zinc-100">
										{message}
									</span>
									<button
										onClick={() => dismiss(id)}
										className="text-zinc-400 hover:text-zinc-600"
										aria-label="Đóng"
									>
										<X size={14} />
									</button>
								</motion.div>
							);
						})}
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
