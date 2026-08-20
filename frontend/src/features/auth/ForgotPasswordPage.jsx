import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import AuthButton from "./AuthButton";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";
import { EMAIL_PATTERN, OTP_PATTERN, validateNewPassword } from "./passwordRules";

// Luồng hai bước trên cùng một trang, giống màn xác minh email:
//   1. "request" — nhập email, backend gửi OTP 15 phút (POST /auth/forgot-password)
//   2. "reset"   — nhập OTP + mật khẩu mới           (POST /auth/reset-password)
//
// Không tách thành hai route vì bước 2 cần giữ email của bước 1; một route
// riêng sẽ mất dữ liệu khi người dùng tải lại trang và không có gì để khôi phục.
//
// Cổng giới hạn /auth/forgot-password ở 5 lần/giờ theo IP (RateLimitFilter), nên
// mọi lỗi 429 đều phải hiển thị nguyên văn thay vì nuốt đi.
const USER_NOT_EXISTED_CODE = 1102;

export default function ForgotPasswordPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const toast = useToast();

	const [step, setStep] = useState("request");
	const [form, setForm] = useState(() => ({
		email: location.state?.email || "",
		otpCode: "",
		newPassword: "",
		confirmPassword: "",
	}));
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	const onChange = (event) => {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: value }));
		setErrors((current) => {
			if (!current[name] && !current.form) return current;
			const next = { ...current };
			delete next[name];
			delete next.form;
			return next;
		});
	};

	const sendOtp = async (event) => {
		event?.preventDefault();
		if (!EMAIL_PATTERN.test(form.email.trim())) {
			setErrors({ email: "Email không hợp lệ (ví dụ: ten@example.com)." });
			return;
		}
		setErrors({});
		setLoading(true);
		try {
			await api.post(endpoints.auth.forgotPassword, { email: form.email.trim() });
			toast.success("Mã đặt lại mật khẩu đã được gửi đến email của bạn.");
			setStep("reset");
		} catch (error) {
			// Backend trả USER_NOT_EXISTED cho cả "email chưa đăng ký" lẫn "email
			// chưa xác minh" — không phân biệt được, nên nói cả hai khả năng.
			setErrors({
				form:
					error.code === USER_NOT_EXISTED_CODE
						? "Không tìm thấy tài khoản đã xác minh với email này."
						: error.message || "Không gửi được mã đặt lại mật khẩu.",
			});
		} finally {
			setLoading(false);
		}
	};

	const resetPassword = async (event) => {
		event.preventDefault();
		const next = validateNewPassword(form.newPassword, form.confirmPassword, {
			password: "newPassword",
		});
		if (!OTP_PATTERN.test(form.otpCode.trim())) {
			next.otpCode = "Mã OTP phải gồm đúng 6 chữ số.";
		}
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setLoading(true);
		try {
			await api.post(endpoints.auth.resetPassword, {
				email: form.email.trim(),
				otpCode: form.otpCode.trim(),
				newPassword: form.newPassword,
			});
			toast.success("Đặt lại mật khẩu thành công. Hãy đăng nhập lại.");
			navigate("/login", { replace: true, state: { username: form.email.trim() } });
		} catch (error) {
			setErrors({ form: error.message || "Không đặt lại được mật khẩu." });
		} finally {
			setLoading(false);
		}
	};

	if (step === "request") {
		return (
			<AuthLayout>
				<h1 className="text-lg font-semibold text-ink">Quên mật khẩu?</h1>
				<p className="mt-1 mb-6 text-sm leading-5 text-muted">
					Nhập email đã đăng ký. Chúng tôi sẽ gửi cho bạn một mã gồm 6 chữ số để
					đặt lại mật khẩu.
				</p>

				<form onSubmit={sendOtp} className="flex flex-col gap-2.5" noValidate>
					<AuthField
						name="email"
						type="email"
						value={form.email}
						onChange={onChange}
						placeholder="Email đăng ký"
						autoComplete="email"
						aria-label="Email đăng ký"
						error={errors.email}
						required
					/>
					{errors.form && <p className="px-1 text-sm text-like">{errors.form}</p>}
					<AuthButton
						type="submit"
						className="mt-3"
						loading={loading}
						disabled={!form.email.trim()}
					>
						Gửi mã đặt lại
					</AuthButton>
				</form>

				<div aria-hidden className="my-7 h-px bg-line" />

				<p className="text-center text-sm text-muted">
					Đã nhớ ra mật khẩu?{" "}
					<Link to="/login" className="font-semibold text-accent hover:underline">
						Quay lại đăng nhập
					</Link>
				</p>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout>
			<h1 className="text-lg font-semibold text-ink">Đặt lại mật khẩu</h1>
			<p className="mt-1 mb-6 text-sm leading-5 text-muted">
				Nhập mã đã gửi tới <span className="font-semibold text-ink">{form.email}</span>{" "}
				cùng mật khẩu mới. Mã có hiệu lực trong 15 phút.
			</p>

			<form onSubmit={resetPassword} className="flex flex-col gap-2.5" noValidate>
				<AuthField
					name="otpCode"
					value={form.otpCode}
					onChange={onChange}
					placeholder="Mã 6 chữ số"
					autoComplete="one-time-code"
					inputMode="numeric"
					maxLength={6}
					aria-label="Mã đặt lại mật khẩu"
					error={errors.otpCode}
					required
				/>
				<AuthField
					name="newPassword"
					type="password"
					value={form.newPassword}
					onChange={onChange}
					placeholder="Mật khẩu mới"
					autoComplete="new-password"
					aria-label="Mật khẩu mới"
					error={errors.newPassword}
					required
				/>
				<AuthField
					name="confirmPassword"
					type="password"
					value={form.confirmPassword}
					onChange={onChange}
					placeholder="Xác nhận mật khẩu mới"
					autoComplete="new-password"
					aria-label="Xác nhận mật khẩu mới"
					error={errors.confirmPassword}
					required
				/>
				{errors.form && <p className="px-1 text-sm text-like">{errors.form}</p>}
				<AuthButton type="submit" className="mt-3" loading={loading}>
					Đặt lại mật khẩu
				</AuthButton>
				<AuthButton
					type="button"
					variant="outline"
					disabled={loading}
					onClick={() => {
						setErrors({});
						setStep("request");
					}}
				>
					Đổi email khác
				</AuthButton>
			</form>

			<p className="mt-6 text-center text-sm text-muted">
				Chưa nhận được mã?{" "}
				<button
					type="button"
					onClick={sendOtp}
					disabled={loading}
					className="font-semibold text-accent hover:underline disabled:opacity-40"
				>
					Gửi lại
				</button>
			</p>
		</AuthLayout>
	);
}
