import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowClockwise, Scales } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";
import endpoints from "../../lib/endpoints";
import { timeAgo } from "../../lib/format";
import Badge from "../moderation/components/Badge";
import { usePagedList } from "../moderation/usePagedList";
import { APPEAL_STATUS_LABELS, APPEAL_STATUS_TONES } from "../moderation/constants";

// Mặc định là khiếu nại đang chờ — đó là việc cần làm. Việc xét khiếu nại diễn
// ra ở màn chi tiết hồ sơ, nơi có đủ bằng chứng và nhật ký, nên ở đây chỉ dẫn
// đường sang chứ không nhân bản form xét.
const STATUS_TABS = [
	{ key: "PENDING", label: "Chờ xét" },
	{ key: "UPHELD", label: "Giữ nguyên" },
	{ key: "OVERTURNED", label: "Đã đảo ngược" },
	{ key: "", label: "Tất cả" },
];

export default function AppealsPage() {
	const [status, setStatus] = useState("PENDING");

	const params = {};
	if (status) params.status = status;

	const { items, loading, loadingMore, hasNext, error, loadMore, reload } = usePagedList(
		endpoints.moderation.appeals.queue,
		params,
	);

	return (
		<div className="mx-auto max-w-[900px] px-4 pb-16 pt-4 md:pt-[30px]">
			<Link
				to="/admin/moderation"
				className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
			>
				<ArrowLeft size={16} />
				Hàng đợi kiểm duyệt
			</Link>

			<div className="flex items-center justify-between border-b border-line pb-4">
				<div>
					<h1 className="text-2xl font-bold text-ink">Khiếu nại</h1>
					<p className="mt-0.5 text-sm text-muted">
						Người bị xử lý yêu cầu xem xét lại quyết định.
					</p>
				</div>
				<Button variant="secondary" size="sm" onClick={reload}>
					<ArrowClockwise size={16} />
					Làm mới
				</Button>
			</div>

			<div className="flex flex-wrap gap-1.5 py-4">
				{STATUS_TABS.map((t) => (
					<Button
						key={t.key || "all"}
						size="sm"
						variant={status === t.key ? "primary" : "secondary"}
						onClick={() => setStatus(t.key)}
					>
						{t.label}
					</Button>
				))}
			</div>

			<Card flush className="overflow-hidden">
				{loading ? (
					<div className="flex justify-center py-16">
						<Spinner size={24} className="text-muted" />
					</div>
				) : error ? (
					<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
						<p className="text-sm text-muted">{error}</p>
						<Button variant="outline" size="sm" onClick={reload}>
							Thử lại
						</Button>
					</div>
				) : items.length === 0 ? (
					<EmptyState
						icon={Scales}
						title="Không có khiếu nại nào"
						description="Không có khiếu nại nào khớp bộ lọc hiện tại."
					/>
				) : (
					<>
						{items.map((a) => (
							<Link
								key={a.id}
								to={`/admin/moderation/${a.caseId}`}
								className="block border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-hover"
							>
								<div className="flex flex-wrap items-center gap-2">
									<Badge tone={APPEAL_STATUS_TONES[a.status]}>
										{APPEAL_STATUS_LABELS[a.status] || a.status}
									</Badge>
									<span className="text-xs text-muted">
										{timeAgo(a.createdAt)}
									</span>
								</div>
								<p className="mt-1.5 line-clamp-2 break-words text-sm text-ink">
									{a.reason}
								</p>
								<p className="mt-1 truncate text-xs text-faint">
									Hồ sơ {a.caseId}
								</p>
							</Link>
						))}
						{hasNext && (
							<div className="flex justify-center py-4">
								{loadingMore ? (
									<Spinner size={20} className="text-accent" />
								) : (
									<Button variant="ghost" size="sm" onClick={loadMore}>
										Xem thêm
									</Button>
								)}
							</div>
						)}
					</>
				)}
			</Card>
		</div>
	);
}
