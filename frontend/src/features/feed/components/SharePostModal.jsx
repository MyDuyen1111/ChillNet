import { useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { Avatar, Button, Modal, Textarea } from "../../../components/ui";

const MAX_MESSAGE = 2200;

// `POST /post/share/{id}` nhận tham số `content` và dùng nó làm nội dung của bài
// đăng lại. Trước đây giao diện gọi thẳng không kèm gì nên mọi bài chia sẻ đều
// trống trơn — người xem chỉ thấy ảnh gốc mà không biết vì sao nó được đăng lại.
//
// Lưu ý: post-service luôn đặt bài chia sẻ ở mức PUBLIC và chỉ cho chia sẻ bài
// PUBLIC (hoặc bài của chính mình), nên ở đây không có ô quyền riêng tư.
export default function SharePostModal({ open, onClose, post, onSubmit, loading }) {
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (open) setMessage("");
	}, [open]);

	const preview = post?.imageUrls?.[0];

	return (
		<Modal
			open={open}
			onClose={() => !loading && onClose()}
			title="Chia sẻ bài viết"
			size="md"
		>
			<Textarea
				rows={4}
				maxLength={MAX_MESSAGE}
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				placeholder="Viết gì đó về bài viết này..."
				aria-label="Lời nhắn khi chia sẻ"
				autoFocus
			/>

			<div className="mt-4 flex items-start gap-3 rounded-xl border border-line p-3">
				{preview ? (
					<img
						src={preview}
						alt=""
						className="h-14 w-14 shrink-0 rounded-lg object-cover"
					/>
				) : (
					<Avatar src={post?.userAvatar} name={post?.username} size="md" />
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold text-ink">
						{post?.username || "Người dùng"}
					</p>
					<p className="mt-0.5 line-clamp-2 text-xs text-muted">
						{post?.content || "Bài viết không có nội dung chữ."}
					</p>
				</div>
			</div>

			<p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
				<ArrowsClockwise size={14} />
				Bài chia sẻ luôn ở chế độ công khai.
			</p>

			<div className="mt-4 flex justify-end gap-2">
				<Button variant="ghost" onClick={onClose} disabled={loading}>
					Huỷ
				</Button>
				<Button onClick={() => onSubmit(message.trim())} loading={loading}>
					Chia sẻ
				</Button>
			</div>
		</Modal>
	);
}
