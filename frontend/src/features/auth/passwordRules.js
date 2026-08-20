// Luật mật khẩu dùng chung cho mọi màn đặt / đổi mật khẩu.
//
// Regex ở đây là bản sao của @Pattern trên UserCreationRequest.password
// (identity-service). Lưu ý: backend CHỈ kiểm tra luật này lúc đăng ký —
// ResetPasswordRequest và ChangePasswordRequest chỉ có @NotBlank. Vì vậy màn
// đặt lại / đổi mật khẩu phải tự chặn ở client, nếu không người dùng có thể tạo
// ra một mật khẩu yếu hơn mật khẩu mà chính họ đã phải đặt lúc đăng ký.
export const PASSWORD_PATTERN =
	/^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\d)(?=.*[^\p{L}\p{N}\s])\S{8,}$/u;

export const PASSWORD_ERROR =
	"Mật khẩu phải có ít nhất 8 ký tự, gồm chữ thường, chữ in hoa, chữ số và ký tự đặc biệt.";

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const OTP_PATTERN = /^\d{6}$/;

/**
 * Kiểm tra cặp mật khẩu mới + xác nhận. Trả về object lỗi rỗng nếu hợp lệ, để
 * mọi màn dùng chung một bộ thông báo.
 */
export function validateNewPassword(password, confirmPassword, keys = {}) {
	const passwordKey = keys.password || "password";
	const confirmKey = keys.confirmPassword || "confirmPassword";
	const errors = {};
	if (!PASSWORD_PATTERN.test(password || "")) errors[passwordKey] = PASSWORD_ERROR;
	if (!confirmPassword) errors[confirmKey] = "Vui lòng xác nhận mật khẩu.";
	else if (confirmPassword !== password) errors[confirmKey] = "Mật khẩu xác nhận không khớp.";
	return errors;
}
