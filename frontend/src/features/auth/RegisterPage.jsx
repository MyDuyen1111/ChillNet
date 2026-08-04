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
		<AuthLayout
			footer={
				<>
					Đã có tài khoản?{" "}
					<Link to="/login" className="font-semibold text-accent">
						Đăng nhập
					</Link>
				</>
			}
		>
			<p className="mb-4 text-center text-base font-semibold text-muted">
				Đăng ký để xem ảnh và video từ bạn bè.
			</p>
			<form onSubmit={onSubmit} className="flex flex-col gap-1.5">
				<div className="grid grid-cols-2 gap-1.5">
					<Input
						name="firstName"
						value={form.firstName}
						onChange={onChange}
						placeholder="Họ"
						autoComplete="given-name"
						className="bg-canvas"
					/>
					<Input
						name="lastName"
						value={form.lastName}
						onChange={onChange}
						placeholder="Tên"
						autoComplete="family-name"
						className="bg-canvas"
					/>
				</div>
				<Input
					name="username"
					value={form.username}
					onChange={onChange}
					placeholder="Tên đăng nhập"
					autoComplete="username"
					className="bg-canvas"
					error={errors.username}
					required
				/>
				<Input
					name="email"
					type="email"
					value={form.email}
					onChange={onChange}
					placeholder="Email"
					autoComplete="email"
					className="bg-canvas"
					error={errors.email}
					required
				/>
				<Input
					name="password"
					type="password"
					value={form.password}
					onChange={onChange}
					placeholder="Mật khẩu"
					autoComplete="new-password"
					className="bg-canvas"
					error={errors.password || errors.form}
					required
				/>
				<Button
					type="submit"
					variant="primary"
					size="md"
					loading={loading}
					className="mt-3 w-full"
				>
					Đăng ký
				</Button>
			</form>
			<p className="mt-4 text-center text-xs leading-4 text-muted">
				Bằng việc đăng ký, bạn đồng ý với{" "}
				<span className="font-semibold text-muted">Điều khoản</span>,{" "}
				<span className="font-semibold text-muted">Chính sách quyền riêng tư</span> và{" "}
				<span className="font-semibold text-muted">Chính sách cookie</span> của chúng tôi.
			</p>
		</AuthLayout>
	);
}
