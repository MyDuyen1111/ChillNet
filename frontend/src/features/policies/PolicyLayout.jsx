import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/cn";

const NAV = [
	{ to: "/policies/community", label: "Tiêu chuẩn cộng đồng" },
	{ to: "/policies/privacy", label: "Quyền riêng tư" },
];

// Khung chung cho các trang chính sách. Đây là tài liệu tĩnh — không gọi API, nên
// đọc được cả khi tài khoản đang bị hạn chế.
export default function PolicyLayout({ title, updated, children }) {
	const { pathname } = useLocation();

	return (
		<div className="mx-auto max-w-[720px] px-4 pb-20 pt-4 md:pt-[30px]">
			<nav className="flex gap-1.5 pb-4">
				{NAV.map((n) => (
					<Link
						key={n.to}
						to={n.to}
						className={cn(
							"rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
							pathname === n.to
								? "bg-fill-strong text-ink"
								: "text-muted hover:bg-hover hover:text-ink",
						)}
					>
						{n.label}
					</Link>
				))}
			</nav>

			<h1 className="text-2xl font-bold text-ink">{title}</h1>
			{updated && <p className="mt-1 text-xs text-faint">Cập nhật lần cuối: {updated}</p>}

			<div className="mt-6 space-y-6">{children}</div>
		</div>
	);
}

export function PolicySection({ title, children }) {
	return (
		<section>
			<h2 className="text-base font-bold text-ink">{title}</h2>
			<div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">{children}</div>
		</section>
	);
}
