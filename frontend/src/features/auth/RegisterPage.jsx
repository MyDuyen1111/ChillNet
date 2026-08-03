import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Button, Input, useToast } from "../../components/ui";
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
		<AuthLayout title="Tạo tài khoản" subtitle="Chỉ mất một phút để bắt đầu.">
			<form onSubmit={onSubmit} className="space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<Input
						label="Họ"
						name="firstName"
						value={form.firstName}
						onChange={onChange}
						placeholder="Nguyễn"
						autoComplete="given-name"
					/>
					<Input
						label="Tên"
						name="lastName"
						value={form.lastName}
						onChange={onChange}
						placeholder="An"
						autoComplete="family-name"
					/>
				</div>
				<Input
					label="Tên đăng nhập"
					name="username"
					value={form.username}
					onChange={onChange}
					placeholder="chillguy"
					autoComplete="username"
					error={errors.username}
					required
				/>
				<Input
					label="Email"
					name="email"
					type="email"
					value={form.email}
					onChange={onChange}
					placeholder="ban@email.com"
					autoComplete="email"
					error={errors.email}
					required
				/>
				<Input
					label="Mật khẩu"
					name="password"
					type="password"
					value={form.password}
					onChange={onChange}
					placeholder="Tối thiểu 8 ký tự"
					autoComplete="new-password"
					error={errors.password || errors.form}
					required
				/>
				<Button type="submit" size="lg" loading={loading} className="w-full">
					Đăng ký
				</Button>
			</form>
			<p className="mt-6 text-center text-sm text-zinc-500">
				Đã có tài khoản?{" "}
				<Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500">
					Đăng nhập
				</Link>
			</p>
		</AuthLayout>
	);
}
