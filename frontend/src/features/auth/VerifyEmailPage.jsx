import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import AuthButton from "./AuthButton";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const OTP_PATTERN = /^\d{6}$/;

export default function VerifyEmailPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const toast = useToast();
	const [form, setForm] = useState(() => ({
		email: location.state?.email || "",
		otpCode: "",
	}));
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);

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

	const validate = () => {
		const next = {};
		if (!EMAIL_PATTERN.test(form.email.trim())) {
			next.email = "Email không hợp lệ (ví dụ: ten@example.com).";
		}
		if (!OTP_PATTERN.test(form.otpCode.trim())) {
			next.otpCode = "Mã OTP phải gồm đúng 6 chữ số.";
		}
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const onSubmit = async (event) => {
		event.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			await api.post(endpoints.auth.verifyUser, {
				email: form.email.trim(),
				otpCode: form.otpCode.trim(),
			});
			toast.success("Xác minh email thành công. Bạn có thể đăng nhập.");
			navigate("/login", {
				replace: true,
				state: {
					username: location.state?.username || form.email.trim(),
					from: location.state?.from,
				},
			});
		} catch (error) {
			setErrors({ form: error.message || "Không thể xác minh email." });
		} finally {
			setLoading(false);
		}
	};

	const resendOtp = async () => {
		if (!EMAIL_PATTERN.test(form.email.trim())) {
			setErrors({ email: "Vui lòng nhập email hợp lệ trước khi gửi lại mã." });
			return;
		}
		setErrors({});
		setResending(true);
		try {
			await api.post(endpoints.auth.resendVerification, {
				email: form.email.trim(),
			});
			toast.success("Một mã OTP mới đã được gửi đến email của bạn.");
		} catch (error) {
			setErrors({ form: error.message || "Không thể gửi lại mã OTP." });
		} finally {
			setResending(false);
		}
	};

	return (
		<AuthLayout>
			<h1 className="text-lg font-semibold text-ink">Xác minh email</h1>
			<p className="mt-1 mb-6 text-sm leading-5 text-muted">
				Nhập mã OTP 6 chữ số đã được gửi đến email đăng ký. Mã có hiệu lực trong 15
				phút.
			</p>

			<form onSubmit={onSubmit} className="flex flex-col gap-2.5" noValidate>
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
				<AuthField
					name="otpCode"
					value={form.otpCode}
					onChange={onChange}
					placeholder="Mã OTP 6 chữ số"
					autoComplete="one-time-code"
					inputMode="numeric"
					maxLength={6}
					aria-label="Mã OTP"
					error={errors.otpCode}
					required
				/>
				{errors.form && <p className="px-1 text-sm text-like">{errors.form}</p>}
				<AuthButton
					type="submit"
					className="mt-3"
					loading={loading}
					disabled={resending}
				>
					Xác minh tài khoản
				</AuthButton>
				<AuthButton
					type="button"
					variant="outline"
					loading={resending}
					disabled={loading}
					onClick={resendOtp}
				>
					Gửi lại mã OTP
				</AuthButton>
			</form>

			<p className="mt-6 text-center text-sm text-muted">
				Đã xác minh?{" "}
				<Link to="/login" className="font-semibold text-accent hover:underline">
					Quay lại đăng nhập
				</Link>
			</p>
		</AuthLayout>
	);
}
