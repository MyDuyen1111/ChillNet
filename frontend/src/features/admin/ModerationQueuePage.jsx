import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowClockwise, ShieldCheck, Warning } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { timeAgo } from "../../lib/format";
import { cn } from "../../lib/cn";
import Badge from "../moderation/components/Badge";
import { usePagedList } from "../moderation/usePagedList";
import {
	CASE_STATUS_LABELS,
	CASE_STATUS_TONES,
	MODERATION_ACTION_LABELS,
	SEVERITY_LABELS,
	SEVERITY_TONES,
	TARGET_TYPE_LABELS,
} from "../moderation/constants";

// Hàng đợi mặc định là "Chờ xử lý": việc cần làm nằm ở đầu, không phải toàn bộ
// lịch sử. Backend đã sắp theo mức nghiêm trọng rồi mới tới thời gian mở hồ sơ.
const STATUS_TABS = [
	{ key: "OPEN", label: "Chờ xử lý" },
	{ key: "IN_REVIEW", label: "Đang xem xét" },
	{ key: "APPEALED", label: "Đang khiếu nại" },
	{ key: "ACTIONED", label: "Đã xử lý" },
	{ key: "DISMISSED", label: "Không vi phạm" },
	{ key: "", label: "Tất cả" },
];

const TYPE_TABS = [
	{ key: "", label: "Mọi loại" },
	{ key: "POST", label: "Bài viết" },
	{ key: "COMMENT", label: "Bình luận" },
	{ key: "USER", label: "Tài khoản" },
	{ key: "GROUP", label: "Nhóm" },
];

function StatCard({ label, value, tone, emphasis }) {
	return (
		<Card className={cn("p-3", emphasis && "border-amber-500/40")}>
			<p className="text-xs text-muted">{label}</p>
			<p className={cn("mt-1 text-2xl font-bold tabular-nums", tone || "text-ink")}>
				{value ?? 0}
			</p>
		</Card>
	);
}

function StatsRow() {
	const [stats, setStats] = useState(null);

	useEffect(() => {
		let alive = true;
		api.get(endpoints.moderation.cases.stats)
			.then((s) => alive && setStats(s))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			<StatCard
				label="Chờ xử lý"
				value={stats?.openCases}
				tone="text-amber-600 dark:text-amber-400"
				emphasis={Boolean(stats?.openCases)}
			/>
			<StatCard label="Đang xem xét" value={stats?.inReviewCases} />
			<StatCard label="Đã xử lý" value={stats?.actionedCases} />
			<StatCard label="Không vi phạm" value={stats?.dismissedCases} />
			<StatCard
				label="Khiếu nại chờ xét"
				value={stats?.pendingAppeals}
				tone="text-purple-600 dark:text-purple-400"
				emphasis={Boolean(stats?.pendingAppeals)}
			/>
			<StatCard label="Tổng báo cáo" value={stats?.totalReports} />
		</div>
	);
}

function FilterRow({ tabs, value, onChange, ariaLabel }) {
	return (
		<div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
			{tabs.map((t) => (
				<Button
					key={t.key || "all"}
					size="sm"
					variant={value === t.key ? "primary" : "secondary"}
					onClick={() => onChange(t.key)}
				>
					{t.label}
				</Button>
			))}
		</div>
	);
}

function CaseRow({ item }) {
	// reportCount >= 5 là ngưỡng backend tự leo thang mức nghiêm trọng — đánh dấu
	// để kiểm duyệt viên thấy ngay hồ sơ nào đang bị báo cáo dồn dập.
	const escalated = item.reportCount >= 5;

	return (
		<Link
			to={`/admin/moderation/${item.id}`}
			className="flex items-start gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-hover"
		>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-sm font-semibold text-ink">
						{TARGET_TYPE_LABELS[item.targetType] || item.targetType}
					</span>
					<Badge tone={CASE_STATUS_TONES[item.status]}>
						{CASE_STATUS_LABELS[item.status] || item.status}
					</Badge>
					<Badge tone={SEVERITY_TONES[item.severity]}>
						{SEVERITY_LABELS[item.severity] || item.severity}
					</Badge>
					{escalated && (
						<Badge tone="bg-red-500/15 text-red-600 dark:text-red-400">
							<Warning size={12} weight="fill" className="mr-1" />
							{item.reportCount} báo cáo
						</Badge>
					)}
				</div>

				<p className="mt-1 truncate text-xs text-muted">
					Mã hồ sơ {item.id}
					{item.targetOwnerId ? ` · chủ sở hữu ${item.targetOwnerId}` : ""}
				</p>

				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
					<span>{timeAgo(item.createdAt)}</span>
					{!escalated && <span>{item.reportCount} báo cáo</span>}
					{item.action && item.action !== "NONE" && (
						<span className="font-semibold text-ink">
							{MODERATION_ACTION_LABELS[item.action] || item.action}
						</span>
					)}
					{item.assigneeId && <span>Đã có người nhận</span>}
				</div>
			</div>
		</Link>
	);
}

export default function ModerationQueuePage() {
	const [status, setStatus] = useState("OPEN");
	const [targetType, setTargetType] = useState("");

	// Chuỗi rỗng nghĩa là "không lọc" — phải bỏ hẳn khỏi query string, vì Spring
	// không ép được "" thành enum và sẽ trả 400.
	const params = {};
	if (status) params.status = status;
	if (targetType) params.targetType = targetType;

	const { items, loading, loadingMore, hasNext, error, loadMore, reload } = usePagedList(
		endpoints.moderation.cases.queue,
		params,
	);

	const onRefresh = useCallback(() => reload(), [reload]);

	return (
		<div className="mx-auto max-w-[900px] px-4 pb-16 pt-4 md:pt-[30px]">
			<div className="flex items-center justify-between border-b border-line pb-4">
				<div>
					<h1 className="text-2xl font-bold text-ink">Kiểm duyệt</h1>
					<p className="mt-0.5 text-sm text-muted">
						Hàng đợi hồ sơ, sắp theo mức nghiêm trọng rồi tới thời gian mở.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						to="/admin/appeals"
						className="text-sm font-semibold text-accent hover:opacity-70"
					>
						Khiếu nại
					</Link>
					<Button variant="secondary" size="sm" onClick={onRefresh}>
						<ArrowClockwise size={16} />
						Làm mới
					</Button>
				</div>
			</div>

			<div className="py-4">
				<StatsRow />
			</div>

			<div className="space-y-2 pb-4">
				<FilterRow
					tabs={STATUS_TABS}
					value={status}
					onChange={setStatus}
					ariaLabel="Lọc theo trạng thái hồ sơ"
				/>
				<FilterRow
					tabs={TYPE_TABS}
					value={targetType}
					onChange={setTargetType}
					ariaLabel="Lọc theo loại đối tượng"
				/>
			</div>

			<Card flush className="overflow-hidden">
				{loading ? (
					<div className="flex justify-center py-16">
						<Spinner size={24} className="text-muted" />
					</div>
				) : error ? (
					<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
						<p className="text-sm text-muted">{error}</p>
						<Button variant="outline" size="sm" onClick={onRefresh}>
							<ArrowClockwise size={16} />
							Thử lại
						</Button>
					</div>
				) : items.length === 0 ? (
					<EmptyState
						icon={ShieldCheck}
						title="Không có hồ sơ nào"
						description="Không có hồ sơ nào khớp bộ lọc hiện tại."
					/>
				) : (
					<>
						{items.map((item) => (
							<CaseRow key={item.id} item={item} />
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
