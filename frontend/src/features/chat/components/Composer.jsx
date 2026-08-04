import { useState } from "react";
import { Heart, ImageSquare, Smiley } from "@phosphor-icons/react";
import { IconButton } from "../../../components/ui";

// Message input. Instagram's composer is a single-line pill: Enter sends, the
// trailing icons swap for a "Gửi" text link the moment there is text to send.
export default function Composer({ onSend, disabled }) {
	const [text, setText] = useState("");
	const hasText = text.trim().length > 0;
	const canSend = hasText && !disabled;

	const submit = () => {
		const value = text.trim();
		if (!value || disabled) return;
		onSend(value);
		setText("");
	};

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				submit();
			}}
			className="shrink-0 px-4 pb-5 pt-2"
		>
			<div className="flex items-center gap-3 rounded-full border border-line px-4 py-2">
				<IconButton label="Chọn biểu tượng cảm xúc">
					<Smiley size={24} />
				</IconButton>
				<input
					type="text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Nhắn tin..."
					disabled={disabled}
					className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none disabled:opacity-50"
				/>
				{hasText ? (
					<button
						type="submit"
						disabled={!canSend}
						className="shrink-0 text-sm font-semibold text-accent disabled:opacity-40"
					>
						Gửi
					</button>
				) : (
					<>
						<IconButton label="Gửi ảnh">
							<ImageSquare size={24} />
						</IconButton>
						<IconButton label="Gửi tim">
							<Heart size={24} />
						</IconButton>
					</>
				)}
			</div>
		</form>
	);
}
