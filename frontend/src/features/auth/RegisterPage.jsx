import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui";
import AuthButton from "./AuthButton";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";

const EMPTY = {
	firstName: "",
	lastName: "",
	username: "",
	email: "",
	password: "",
};

export default function RegisterPage() {
	const { register } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const [form, setForm] = useState(EMPTY);
	const [errors, setErrors] = useState({});
	const [loading, setLoading] = useState(false);

	const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

	const validate = () => {
		const next = {};
		if (form.username.trim().length < 3) next.username = "Tối thiểu 3 ký tự.";
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Email không hợp lệ.";
		if (form.password.length < 8) next.password = "Mật khẩu tối thiểu 8 ký tự.";
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const onSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setLoading(true);
		try {
			await register(form);
			toast.success("Tạo tài khoản thành công! Hãy đăng nhập.");
			navigate("/login", { replace: true });
		} catch (err) {
			setErrors({ form: err.message || "Đăng ký thất bại." });
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

			<form onSubmit={onSubmit} className="flex flex-col gap-2.5">
				<div className="grid grid-cols-2 gap-2.5">
					<AuthField
						name="firstName"
						value={form.firstName}
						onChange={onChange}
						placeholder="Họ"
						autoComplete="given-name"
						aria-label="Họ"
					/>
					<AuthField
						name="lastName"
						value={form.lastName}
						onChange={onChange}
						placeholder="Tên"
						autoComplete="family-name"
						aria-label="Tên"
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
					error={errors.password || errors.form}
					required
				/>
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
