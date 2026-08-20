import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	BookOpen,
	Flag,
	Lock,
	ShieldCheck,
	SignOut,
	UserCircle,
} from "@phosphor-icons/react";
import { Button, Card, Input, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { PASSWORD_ERROR, validateNewPassword } from "../auth/passwordRules";

// Nơi ở của những thao tác tài khoản không thuộc về trang cá nhân. Trước đây
// mục "Cài đặt" trên thanh điều hướng trỏ thẳng sang /profile, nên đổi mật khẩu
// — endpoint đã có sẵn ở identity-service — không có chỗ nào để gọi.
const INVALID_OLD_PASSWORD_CODE = 1205;

const EMPTY = { oldPassword: "", newPassword: "", confirmPassword: "" };

function ChangePasswordCard() {
	const toast = useToast();
	const [form, setForm] = useState(EMPTY);
	const [errors, setErrors] = useState({});
	const [saving, setSaving] = useState(false);

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

	const onSubmit = async (event) => {
		event.preventDefault();
		const next = validateNewPassword(form.newPassword, form.confirmPassword, {
			password: "newPassword",
		});
		if (!form.oldPassword) next.oldPassword = "Vui lòng nhập mật khẩu hiện tại.";
		else if (form.oldPassword === form.newPassword) {
			next.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại.";
		}
		setErrors(next);
		if (Object.keys(next).length > 0) return;

		setSaving(true);
		try {
			await api.put(endpoints.auth.changePassword, {
				oldPassword: form.oldPassword,
				newPassword: form.newPassword,
			});
			setForm(EMPTY);
			toast.success("Đổi mật khẩu thành công.");
		} catch (error) {
			if (error.code === INVALID_OLD_PASSWORD_CODE) {
				setErrors({ oldPassword: "Mật khẩu hiện tại không đúng." });
			} else {
				setErrors({ form: error.message || "Không đổi được mật khẩu." });
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card className="p-4 sm:p-5">
			<div className="mb-4 flex items-center gap-2">
				<Lock size={20} className="text-muted" />
				<h2 className="text-base font-semibold text-ink">Đổi mật khẩu</h2>
			</div>

			<form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
				<Input
					label="Mật khẩu hiện tại"
					name="oldPassword"
					type="password"
					value={form.oldPassword}
					onChange={onChange}
					autoComplete="current-password"
					error={errors.oldPassword}
				/>
				<Input
					label="Mật khẩu mới"
					name="newPassword"
					type="password"
					value={form.newPassword}
					onChange={onChange}
					autoComplete="new-password"
					error={errors.newPassword}
					hint={PASSWORD_ERROR}
				/>
				<Input
					label="Xác nhận mật khẩu mới"
					name="confirmPassword"
					type="password"
					value={form.confirmPassword}
					onChange={onChange}
					autoComplete="new-password"
					error={errors.confirmPassword}
				/>
				{errors.form && <p className="text-sm text-like">{errors.form}</p>}
				<div className="flex justify-end pt-1">
					<Button type="submit" loading={saving}>
						Cập nhật mật khẩu
					</Button>
				</div>
			</form>

			<p className="mt-3 border-t border-line pt-3 text-xs text-muted">
				Quên mật khẩu hiện tại?{" "}
				<Link to="/forgot-password" className="font-semibold text-accent hover:underline">
					Đặt lại qua email
				</Link>
				.
			</p>
		</Card>
	);
}

function LinkRow({ to, icon: Icon, label, description }) {
	return (
		<Link
			to={to}
			className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-hover"
		>
			<Icon size={20} className="shrink-0 text-muted" />
			<span className="min-w-0">
				<span className="block text-sm font-semibold text-ink">{label}</span>
				<span className="block text-xs text-muted">{description}</span>
			</span>
		</Link>
	);
}

export default function SettingsPage() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const isAdmin = Boolean(user?.roles?.includes("ROLE_ADMIN"));

	const onLogout = async () => {
		await logout();
		navigate("/login", { replace: true });
	};

	return (
		<div className="mx-auto max-w-[640px] px-4 pb-16 pt-4 md:pt-[30px]">
			<div className="border-b border-line pb-4">
				<h1 className="text-2xl font-bold text-ink">Cài đặt</h1>
				<p className="mt-0.5 text-sm text-muted">
					Quản lý bảo mật tài khoản và các tuỳ chọn của bạn.
				</p>
			</div>

			<div className="flex flex-col gap-4 pt-4">
				<ChangePasswordCard />

				<Card flush className="overflow-hidden">
					<LinkRow
						to="/profile"
						icon={UserCircle}
						label="Trang cá nhân"
						description="Ảnh đại diện, ảnh bìa và thông tin giới thiệu"
					/>
					<LinkRow
						to="/my-reports"
						icon={Flag}
						label="Báo cáo của tôi"
						description="Báo cáo đã gửi, hồ sơ liên quan và khiếu nại"
					/>
					{isAdmin && (
						<LinkRow
							to="/admin/moderation"
							icon={ShieldCheck}
							label="Hàng đợi kiểm duyệt"
							description="Xử lý báo cáo của người dùng"
						/>
					)}
					<LinkRow
						to="/policies/community"
						icon={BookOpen}
						label="Tiêu chuẩn cộng đồng"
						description="Nội dung nào được phép trên ChillNet"
					/>
				</Card>

				<Card className="p-4 sm:p-5">
					<h2 className="text-base font-semibold text-ink">Phiên đăng nhập</h2>
					<p className="mt-1 text-sm text-muted">
						Đăng xuất sẽ vô hiệu hoá token hiện tại trên máy chủ, không chỉ xoá
						khỏi trình duyệt này.
					</p>
					<div className="mt-3">
						<Button variant="danger" onClick={onLogout}>
							<SignOut size={16} weight="bold" />
							Đăng xuất
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
