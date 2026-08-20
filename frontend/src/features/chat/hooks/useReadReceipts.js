import { useEffect, useState } from "react";
import api from "../../../lib/api";
import endpoints from "../../../lib/endpoints";

// Nhịp hỏi lại trạng thái "đã xem" khi vẫn còn người chưa đọc. Người kia có thể
// đọc tin mà không trả lời, nên nếu chỉ đợi sự kiện WebSocket thì dòng "Đã xem"
// sẽ không bao giờ hiện: chat-service chỉ phát tin nhắn mới, không phát receipt.
const POLL_MS = 15000;

// Giữ tham chiếu cố định để component không render lại chỉ vì mảng rỗng đổi id.
const EMPTY = Object.freeze([]);

/**
 * Trạng thái "đã xem" của ĐÚNG MỘT tin nhắn — luôn là tin cuối cùng do chính
 * mình gửi. Cố tình không nhận danh sách tin: hỏi cho từng bong bóng sẽ biến
 * một lần mở hội thoại thành hàng chục request.
 *
 * Vòng lặp tự tắt khi đủ số người đã xem, và bỏ qua lượt hỏi lúc tab bị ẩn.
 *
 * @param messageId       id tin nhắn cần theo dõi (bỏ qua id optimistic "temp-").
 * @param currentUserId   để loại receipt của chính mình (nếu backend có trả về).
 * @param expectedReaders số người còn lại trong hội thoại — mốc để dừng hỏi.
 * @param refreshKey      đổi giá trị là hỏi lại (dùng id tin mới nhất của luồng).
 */
export default function useReadReceipts({
	messageId,
	currentUserId,
	expectedReaders = 0,
	refreshKey,
}) {
	// Gói id vào state để dữ liệu của tin trước không bị hiểu nhầm là của tin
	// hiện tại trong lúc request mới còn đang bay.
	const [state, setState] = useState({ id: null, list: EMPTY });

	useEffect(() => {
		if (!messageId || messageId.startsWith("temp-")) return undefined;

		let cancelled = false;
		let timer = null;

		const loop = (immediate) => {
			if (cancelled) return;
			if (!immediate && document.visibilityState !== "visible") {
				// Hội thoại mở ở tab nền thì không ai đọc dòng này — hoãn tới lượt sau.
				timer = setTimeout(() => loop(false), POLL_MS);
				return;
			}
			api.get(endpoints.chat.readReceipts(messageId))
				.then((list) => {
					if (cancelled) return;
					const others = (Array.isArray(list) ? list : []).filter(
						(r) => r?.userId && r.userId !== currentUserId,
					);
					setState({ id: messageId, list: others.length ? others : EMPTY });
					if (others.length < expectedReaders) {
						timer = setTimeout(() => loop(false), POLL_MS);
					}
				})
				.catch(() => {
					// Read receipt là thông tin phụ: hỏng thì dừng hẳn và không hiện gì,
					// tuyệt đối không toast — người dùng không làm gì sai để bị báo lỗi.
				});
		};

		loop(true);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [messageId, currentUserId, expectedReaders, refreshKey]);

	// state chỉ được ghi khi request thành công, nên `ready` cũng có nghĩa là
	// "đã có dữ liệu thật cho đúng tin này".
	const ready = !!messageId && state.id === messageId;
	return { receipts: ready ? state.list : EMPTY, ready };
}
