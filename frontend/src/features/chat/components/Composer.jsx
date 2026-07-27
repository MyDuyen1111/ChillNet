import { useRef, useState } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { Button } from "../../../components/ui";
import { cn } from "../../../lib/cn";

// Message input. Enter sends, Shift+Enter inserts a newline; the textarea grows
// with its content up to a cap.
export default function Composer({ onSend, disabled }) {
	const [text, setText] = useState("");
	const areaRef = useRef(null);
	const canSend = text.trim().length > 0 && !disabled;

	const autoGrow = (el) => {
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
	};

	const submit = () => {
		const value = text.trim();
		if (!value || disabled) return;
		onSend(value);
		setText("");
		if (areaRef.current) areaRef.current.style.height = "auto";
	};

	const onKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				submit();
			}}
			className="flex items-end gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<textarea
				ref={areaRef}
				rows={1}
				value={text}
				onChange={(e) => {
					setText(e.target.value);
					autoGrow(e.target);
				}}
				onKeyDown={onKeyDown}
				placeholder="Nhắn gì đó..."
				disabled={disabled}
				className={cn(
					"max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400",
					"transition-colors focus:border-brand-500 focus:outline-none",
					"dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500",
					"disabled:opacity-50",
				)}
			/>
			<Button
				type="submit"
				disabled={!canSend}
				className="shrink-0 !px-4"
				aria-label="Gửi tin nhắn"
			>
				<PaperPlaneRight size={18} weight="fill" />
			</Button>
		</form>
	);
}
