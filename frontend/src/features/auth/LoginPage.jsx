import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
		<AuthLayout
			footer={
				<>
					Bạn chưa có tài khoản?{" "}
					<Link to="/register" className="font-semibold text-accent">
						Đăng ký
					</Link>
				</>
			}
		>
			<form onSubmit={onSubmit} className="flex flex-col gap-1.5">
				<Input
					name="username"
					value={form.username}
					onChange={onChange}
					placeholder="Tên đăng nhập"
					autoComplete="username"
					className="bg-canvas"
					required
				/>
				<Input
					name="password"
					type="password"
					value={form.password}
					onChange={onChange}
					placeholder="Mật khẩu"
					autoComplete="current-password"
					className="bg-canvas"
					required
				/>
				{error && <p className="text-center text-sm text-like">{error}</p>}
				<Button
					type="submit"
					variant="primary"
					size="md"
					loading={loading}
					className="mt-3 w-full"
				>
					Đăng nhập
				</Button>
			</form>
		</AuthLayout>
	);
}
