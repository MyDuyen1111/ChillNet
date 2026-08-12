import { Navigate } from "react-router-dom";
import { ShieldWarning } from "@phosphor-icons/react";
import { EmptyState } from "../ui";
import { useAuth } from "../../lib/auth";
import Spinner from "../ui/Spinner";

// Cổng cho khu vực quản trị. Chỉ chặn ở phía giao diện — moderation-service vẫn
// tự kiểm tra `@PreAuthorize("hasRole('ADMIN')")` trên từng endpoint, nên sửa
// role trong localStorage không mở được gì cả.
//
// `scope` trong JWT là chuỗi phân tách bằng dấu cách gồm ROLE_* và các quyền,
// lib/auth.jsx đã tách sẵn thành mảng `roles`.
export default function AdminRoute({ children }) {
	const { user, booting, isAuthenticated } = useAuth();

	if (booting) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner size={26} className="text-muted" />
			</div>
		);
	}

	if (!isAuthenticated) return <Navigate to="/login" replace />;

	if (!user?.roles?.includes("ROLE_ADMIN")) {
		return (
			<EmptyState
				icon={ShieldWarning}
				title="Không có quyền truy cập"
				description="Khu vực này chỉ dành cho kiểm duyệt viên và quản trị viên."
			/>
		);
	}

	return children;
}
