import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui";
import AuthButton from "./AuthButton";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";
import { EMAIL_PATTERN, PASSWORD_ERROR, PASSWORD_PATTERN } from "./passwordRules";

const EMPTY = {
	firstName: "",
	lastName: "",
	username: "",
	email: "",
	password: "",
	confirmPassword: "",
};

const USER_EXISTED_CODE = 1101;
const EMAIL_EXISTED_CODE = 1304;

export default function RegisterPage() {
	const { register } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const [form, setForm] = useState(EMPTY);
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	const onChange = (e) => {
		const { name, value } = e.target;
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
		if (!form.firstName.trim()) next.firstName = "Vui lòng nhập Họ.";
		if (!form.lastName.trim()) next.lastName = "Vui lòng nhập Tên.";
		if (form.username.trim().length < 4) next.username = "Tối thiểu 4 ký tự.";
		if (!EMAIL_PATTERN.test(form.email.trim())) {
			next.email = "Email không hợp lệ (ví dụ: ten@example.com).";
		}
		if (!PASSWORD_PATTERN.test(form.password)) next.password = PASSWORD_ERROR;
		if (!form.confirmPassword) {
			next.confirmPassword = "Vui lòng xác nhận mật khẩu.";
		} else if (form.confirmPassword !== form.password) {
			next.confirmPassword = "Mật khẩu xác nhận không khớp.";
		}
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			await register({
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				username: form.username.trim(),
				email: form.email.trim(),
				password: form.password,
			});
			toast.success("Mã xác minh đã được gửi đến email của bạn.");
			navigate("/verify-email", {
				replace: true,
				state: {
					email: form.email.trim(),
					username: form.username.trim(),
				},
			});
		} catch (err) {
			if (err.code === USER_EXISTED_CODE) {
				setErrors({ username: "Tên đăng nhập đã được sử dụng." });
			} else if (err.code === EMAIL_EXISTED_CODE) {
				setErrors({
					email: "Email đã được đăng ký. Hãy đăng nhập để tiếp tục xác minh.",
				});
			} else {
				setErrors({ form: err.message || "Đăng ký thất bại." });
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthLayout>
			<h1 className="text-lg font-semibold text-ink">Tạo tài khoản ChillNet</h1>
			<p className="mt-1 mb-6 text-sm text-muted">
				Đăng ký để xem ảnh và video từ bạn bè.
			</p>

			<form onSubmit={onSubmit} className="flex flex-col gap-2.5" noValidate>
				<div className="grid grid-cols-2 gap-2.5">
					<AuthField
						name="firstName"
						value={form.firstName}
						onChange={onChange}
						placeholder="Họ"
						autoComplete="family-name"
						aria-label="Họ"
						error={errors.firstName}
						required
					/>
					<AuthField
						name="lastName"
						value={form.lastName}
						onChange={onChange}
						placeholder="Tên"
						autoComplete="given-name"
						aria-label="Tên"
						error={errors.lastName}
						required
					/>
				</div>
				<AuthField
					name="username"
					value={form.username}
					onChange={onChange}
					placeholder="Tên đăng nhập"
					autoComplete="username"
					aria-label="Tên đăng nhập"
					error={errors.username}
					required
				/>
				<AuthField
					name="email"
					type="email"
					value={form.email}
					onChange={onChange}
					placeholder="Email"
					autoComplete="email"
					aria-label="Email"
					error={errors.email}
					required
				/>
				<AuthField
					name="password"
					type="password"
					value={form.password}
					onChange={onChange}
					placeholder="Mật khẩu"
					autoComplete="new-password"
					aria-label="Mật khẩu"
					error={errors.password}
					required
				/>
				<AuthField
					name="confirmPassword"
					type="password"
					value={form.confirmPassword}
					onChange={onChange}
					placeholder="Xác nhận mật khẩu"
					autoComplete="new-password"
					aria-label="Xác nhận mật khẩu"
					error={errors.confirmPassword}
					required
				/>
				{errors.form && <p className="px-1 text-xs text-like">{errors.form}</p>}
				<AuthButton type="submit" className="mt-3" loading={loading}>
					Đăng ký
				</AuthButton>
			</form>

			<p className="mt-4 text-center text-xs leading-4 text-muted">
				Bằng việc đăng ký, bạn đồng ý với{" "}
				<span className="font-semibold">Điều khoản</span>,{" "}
				<span className="font-semibold">Chính sách quyền riêng tư</span> và{" "}
				<span className="font-semibold">Chính sách cookie</span> của chúng tôi.
			</p>

			<div aria-hidden className="my-7 h-px bg-line" />

			<AuthButton as={Link} to="/login" variant="accent">
				Đã có tài khoản? Đăng nhập
			</AuthButton>
		</AuthLayout>
	);
}
