// Nhãn tiếng Việt cho các enum của moderation-service. Backend luôn trả về tên
// enum thô (SPAM, IN_REVIEW, ...); mọi chỗ hiển thị đều đi qua đây để không có
// hai bản dịch lệch nhau giữa màn báo cáo và màn quản trị.
//
// Nguồn: moderation-service/src/main/java/com/tien/moderationservice/entity/*.java

// Thứ tự cố ý: các lý do hay gặp lên trước, CHILD_SAFETY và SELF_HARM tách nhóm
// vì đó là nhóm khẩn cấp, OTHER luôn ở cuối.
export const REPORT_REASONS = [
	{ value: "SPAM", label: "Spam", hint: "Nội dung rác, quảng cáo lặp lại" },
	{ value: "HARASSMENT", label: "Quấy rối hoặc bắt nạt", hint: "Nhắm vào một người cụ thể" },
	{ value: "HATE_SPEECH", label: "Ngôn từ thù ghét", hint: "Công kích theo nhóm, sắc tộc, tôn giáo" },
	{ value: "VIOLENCE", label: "Bạo lực", hint: "Đe doạ hoặc cổ vũ bạo lực" },
	{ value: "SEXUAL_CONTENT", label: "Nội dung tình dục", hint: "Ảnh, video hoặc mô tả khiêu dâm" },
	{ value: "SELF_HARM", label: "Tự gây hại", hint: "Nội dung về tự tử hoặc tự làm hại bản thân" },
	{ value: "CHILD_SAFETY", label: "An toàn trẻ em", hint: "Nội dung gây hại cho trẻ em" },
	{ value: "MISINFORMATION", label: "Thông tin sai lệch", hint: "Thông tin sai có khả năng gây hại" },
	{ value: "SCAM", label: "Lừa đảo", hint: "Chiếm đoạt tiền hoặc thông tin" },
	{ value: "IMPERSONATION", label: "Giả mạo", hint: "Mạo danh người khác hoặc tổ chức" },
	{ value: "COPYRIGHT", label: "Vi phạm bản quyền", hint: "Sử dụng nội dung không được phép" },
	{ value: "OTHER", label: "Lý do khác", hint: "Mô tả cụ thể ở ô bên dưới" },
];

export const REPORT_REASON_LABELS = Object.fromEntries(
	REPORT_REASONS.map((r) => [r.value, r.label]),
);

export const TARGET_TYPE_LABELS = {
	POST: "Bài viết",
	COMMENT: "Bình luận",
	USER: "Tài khoản",
	GROUP: "Nhóm",
};

export const CASE_STATUS_LABELS = {
	OPEN: "Chờ xử lý",
	IN_REVIEW: "Đang xem xét",
	ACTIONED: "Đã xử lý",
	DISMISSED: "Không vi phạm",
	APPEALED: "Đang khiếu nại",
	REVERSED: "Đã đảo ngược",
};

// Màu badge theo trạng thái. Dùng class Tailwind tĩnh (không nội suy chuỗi) để
// không bị JIT loại mất lúc build.
export const CASE_STATUS_TONES = {
	OPEN: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	IN_REVIEW: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
	ACTIONED: "bg-red-500/15 text-red-600 dark:text-red-400",
	DISMISSED: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
	APPEALED: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
	REVERSED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export const SEVERITY_LABELS = {
	LOW: "Thấp",
	MEDIUM: "Trung bình",
	HIGH: "Cao",
	CRITICAL: "Nghiêm trọng",
};

export const SEVERITY_TONES = {
	LOW: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
	MEDIUM: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
	CRITICAL: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export const REPORT_STATUS_LABELS = {
	PENDING: "Chờ phân loại",
	UNDER_REVIEW: "Đang xem xét",
	RESOLVED: "Đã xử lý",
	REJECTED: "Không vi phạm",
};

export const APPEAL_STATUS_LABELS = {
	PENDING: "Chờ xét",
	UPHELD: "Giữ nguyên quyết định",
	OVERTURNED: "Đã đảo ngược",
};

export const APPEAL_STATUS_TONES = {
	PENDING: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	UPHELD: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
	OVERTURNED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

// Biện pháp xử lý, xếp từ nhẹ đến nặng đúng như thang của bộ tiêu chí:
// giảm phân phối → gỡ → khoá tài khoản.
export const MODERATION_ACTIONS = [
	{ value: "NONE", label: "Không vi phạm", hint: "Đóng hồ sơ, không áp dụng biện pháp nào" },
	{ value: "WARN", label: "Cảnh báo", hint: "Chỉ nhắc nhở chủ nội dung" },
	{
		value: "LIMIT_DISTRIBUTION",
		label: "Giảm phân phối",
		hint: "Nội dung vẫn còn nhưng không lên bảng tin, khám phá hay tìm kiếm",
	},
	{ value: "HIDE_CONTENT", label: "Ẩn nội dung", hint: "Chỉ chủ nội dung còn thấy, khôi phục được" },
	{ value: "REMOVE_CONTENT", label: "Gỡ nội dung", hint: "Gỡ khỏi mọi nơi, vẫn khôi phục được" },
	{
		value: "SUSPEND_ACCOUNT",
		label: "Khoá tài khoản có thời hạn",
		hint: "Mất quyền truy cập đến khi hết hạn",
	},
	{ value: "BAN_ACCOUNT", label: "Khoá vĩnh viễn", hint: "Không thể đăng nhập lại" },
];

export const MODERATION_ACTION_LABELS = Object.fromEntries(
	MODERATION_ACTIONS.map((a) => [a.value, a.label]),
);

// Biện pháp tác động lên tài khoản chứ không phải nội dung — dùng để cảnh báo
// thêm trước khi xác nhận, và để quyết định có hỏi số ngày khoá hay không.
export const ACCOUNT_LEVEL_ACTIONS = new Set(["SUSPEND_ACCOUNT", "BAN_ACCOUNT"]);

export const AUDIT_ACTION_LABELS = {
	REPORT_CREATED: "Người dùng gửi báo cáo",
	CASE_OPENED: "Mở hồ sơ",
	CASE_ASSIGNED: "Nhận xử lý",
	CASE_DECIDED: "Ra quyết định",
	ENFORCEMENT_APPLIED: "Đã áp dụng biện pháp",
	ENFORCEMENT_FAILED: "Áp dụng biện pháp thất bại",
	APPEAL_CREATED: "Người dùng gửi khiếu nại",
	APPEAL_REVIEWED: "Đã xét khiếu nại",
	ENFORCEMENT_REVERTED: "Đã gỡ biện pháp",
};

// ENFORCEMENT_FAILED là sự kiện cần nổi bật: hồ sơ chưa thực sự được thi hành.
export const AUDIT_ACTION_TONES = {
	ENFORCEMENT_FAILED: "text-red-600 dark:text-red-400",
	ENFORCEMENT_REVERTED: "text-emerald-600 dark:text-emerald-400",
};

export const CONTENT_MODERATION_STATUS_LABELS = {
	VISIBLE: "Đang hiển thị",
	LIMITED: "Bị giảm phân phối",
	HIDDEN: "Đã ẩn",
	REMOVED: "Đã gỡ",
};

// Trạng thái hồ sơ mà người bị xử lý được phép khiếu nại. Hồ sơ chưa có quyết
// định hoặc đã khiếu nại rồi thì không hiện nút.
export const APPEALABLE_CASE_STATUSES = new Set(["ACTIONED"]);
