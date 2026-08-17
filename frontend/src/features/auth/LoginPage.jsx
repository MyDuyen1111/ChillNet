import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/ui";
import AuthButton from "./AuthButton";
import AuthField from "./AuthField";
import AuthLayout from "./AuthLayout";

const EMAIL_NOT_VERIFIED_CODE = 1307;

export default function LoginPage() {
	const { login, isAuthenticated, booting } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const [form, setForm] = useState(() => ({
		username: location.state?.username || "",
		password: "",
	}));
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (!booting && isAuthenticated) {
		return <Navigate to={location.state?.from?.pathname || "/feed"} replace />;
	}

	const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

	// Nút xanh mờ đi khi chưa nhập đủ, giống Instagram.
	const canSubmit = form.username.trim() !== "" && form.password !== "";

	const onSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await login(form);
			toast.success("Chào mừng trở lại!");
			navigate(location.state?.from?.pathname || "/feed", { replace: true });
		} catch (err) {
			if (err.code === EMAIL_NOT_VERIFIED_CODE) {
				navigate("/verify-email", {
					state: {
						email: form.username.includes("@") ? form.username.trim() : "",
						username: form.username.trim(),
						from: location.state?.from,
					},
				});
				return;
			}
			setError(err.message || "Đăng nhập thất bại.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthLayout>
			<h1 className="mb-6 text-lg font-semibold text-ink">Đăng nhập vào ChillNet</h1>

			<form onSubmit={onSubmit} className="flex flex-col gap-2.5">
				<AuthField
					name="username"
					value={form.username}
					onChange={onChange}
					placeholder="Tên đăng nhập hoặc email"
					autoComplete="username"
					aria-label="Tên đăng nhập hoặc email"
					required
				/>
				<AuthField
					name="password"
					type="password"
					value={form.password}
					onChange={onChange}
					placeholder="Mật khẩu"
					autoComplete="current-password"
					aria-label="Mật khẩu"
					required
				/>
				{error && <p className="px-1 text-sm text-like">{error}</p>}
				<AuthButton type="submit" className="mt-3" loading={loading} disabled={!canSubmit}>
					Đăng nhập
				</AuthButton>
			</form>
			<p className="mt-4 text-center text-sm text-muted">
				Chưa xác minh tài khoản?{" "}
				<Link to="/verify-email" className="font-semibold text-accent hover:underline">
					Nhập mã OTP
				</Link>
			</p>

			<div aria-hidden className="my-7 h-px bg-line" />

			<AuthButton as={Link} to="/register" variant="accent">
				Tạo tài khoản mới
			</AuthButton>

			<p
				className="mt-9 text-center text-xl leading-none text-muted"
				style={{ fontFamily: "var(--font-script)" }}
			>
				ChillNet
			</p>
		</AuthLayout>
	);
}
