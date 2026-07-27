import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, User } from "@phosphor-icons/react";
import { useAuth } from "../../lib/auth";
import { Button, Input, useToast } from "../../components/ui";
import AuthLayout from "./AuthLayout";

export default function LoginPage() {
	const { login, isAuthenticated, booting } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const [form, setForm] = useState({ username: "", password: "" });
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (!booting && isAuthenticated) {
		return <Navigate to={location.state?.from?.pathname || "/feed"} replace />;
	}

	const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await login(form);
			toast.success("Chào mừng trở lại!");
			navigate(location.state?.from?.pathname || "/feed", { replace: true });
		} catch (err) {
			setError(err.message || "Đăng nhập thất bại.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthLayout title="Đăng nhập" subtitle="Rất vui được gặp lại bạn.">
			<form onSubmit={onSubmit} className="space-y-4">
				<Input
					label="Tên đăng nhập"
					name="username"
					value={form.username}
					onChange={onChange}
					placeholder="vd: chillguy"
					autoComplete="username"
					leftIcon={<User size={18} />}
					required
				/>
				<Input
					label="Mật khẩu"
					name="password"
					type="password"
					value={form.password}
					onChange={onChange}
					placeholder="••••••••"
					autoComplete="current-password"
					leftIcon={<Lock size={18} />}
					error={error}
					required
				/>
				<Button type="submit" size="lg" loading={loading} className="w-full">
					Đăng nhập
				</Button>
			</form>
			<p className="mt-6 text-center text-sm text-zinc-500">
				Chưa có tài khoản?{" "}
				<Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500">
					Đăng ký ngay
				</Link>
			</p>
		</AuthLayout>
	);
}
