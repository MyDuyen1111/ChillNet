import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	ArrowLeft,
	ArrowUUpLeft,
	ClockCounterClockwise,
	Flag,
	Gavel,
	Warning,
} from "@phosphor-icons/react";
import { Button, Card, Spinner, Textarea, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { postDate, timeAgo } from "../../lib/format";
import { cn } from "../../lib/cn";
import Badge from "../moderation/components/Badge";
import {
	ACCOUNT_LEVEL_ACTIONS,
	APPEAL_STATUS_LABELS,
	APPEAL_STATUS_TONES,
	AUDIT_ACTION_LABELS,
	AUDIT_ACTION_TONES,
	CASE_STATUS_LABELS,
	CASE_STATUS_TONES,
	CONTENT_MODERATION_STATUS_LABELS,
	MODERATION_ACTIONS,
	MODERATION_ACTION_LABELS,
	REPORT_REASON_LABELS,
	SEVERITY_LABELS,
	SEVERITY_TONES,
	TARGET_TYPE_LABELS,
} from "../moderation/constants";

function Section({ title, icon: Icon, children, className }) {
	return (
		<Card className={cn("p-4", className)}>
			<h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
				{Icon && <Icon size={16} />}
				{title}
			</h2>
			{children}
		</Card>
	);
}

// Ảnh chụp nội dung bị báo cáo, lấy từ service gốc. `content === null` nghĩa là
// nội dung đã bị xoá hẳn khỏi service đó (không phải bị gỡ bởi kiểm duyệt).
function ReportedContent({ targetType, content }) {
	if (!content) {
		return (
			<p className="text-sm text-muted">
				Không lấy được nội dung. Đối tượng có thể đã bị chủ sở hữu xoá, hoặc là tài
				khoản/nhóm chứ không phải nội dung đăng.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2 text-xs text-muted">
				<span>Chủ sở hữu: {content.ownerId || "—"}</span>
				{content.createdAt && <span>· đăng {timeAgo(content.createdAt)}</span>}
				{content.moderationStatus && (
					<Badge
						tone={
							content.moderationStatus === "VISIBLE"
								? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
								: "bg-red-500/15 text-red-600 dark:text-red-400"
						}
					>
						{CONTENT_MODERATION_STATUS_LABELS[content.moderationStatus] ||
							content.moderationStatus}
					</Badge>
				)}
			</div>

			{content.content ? (
				<p className="whitespace-pre-wrap break-words rounded-lg bg-fill p-3 text-sm text-ink">
					{content.content}
				</p>
			) : (
				<p className="text-sm text-muted">(Không có nội dung văn bản)</p>
			)}

			{content.imageUrls?.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{content.imageUrls.map((url) => (
						<img
							key={url}
							src={url}
							alt="Nội dung bị báo cáo"
							className="h-28 w-28 rounded-lg border border-line object-cover"
						/>
					))}
				</div>
			)}

			{targetType === "POST" && content.id && (
				<Link
					to={`/post/${content.id}`}
					className="inline-block text-sm font-semibold text-accent hover:opacity-70"
				>
					Mở bài viết gốc
				</Link>
			)}
		</div>
	);
}

function ReportList({ reports }) {
	if (!reports?.length) return <p className="text-sm text-muted">Chưa có báo cáo nào.</p>;

	return (
		<ul className="space-y-3">
			{reports.map((r) => (
				<li key={r.id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm font-semibold text-ink">
							{REPORT_REASON_LABELS[r.reason] || r.reason}
						</span>
						<span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
					</div>
					{r.description && (
						<p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">
							{r.description}
						</p>
					)}
				</li>
			))}
		</ul>
	);
}

function AuditTimeline({ logs }) {
	if (!logs?.length) return <p className="text-sm text-muted">Chưa có sự kiện nào.</p>;

	return (
		<ol className="space-y-3">
			{logs.map((log) => (
				<li key={log.id} className="flex gap-3">
					<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line" />
					<div className="min-w-0 flex-1">
						<p
							className={cn(
								"text-sm font-semibold text-ink",
								AUDIT_ACTION_TONES[log.action],
							)}
						>
							{AUDIT_ACTION_LABELS[log.action] || log.action}
						</p>
						{log.detail && (
							<p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted">
								{log.detail}
							</p>
						)}
						<p className="mt-0.5 text-xs text-faint">
							{postDate(log.createdAt)}
							{log.actorId ? ` · ${log.actorId}` : ""}
						</p>
					</div>
				</li>
			))}
		</ol>
	);
}

// Form ra quyết định. Chỉ hiện khi hồ sơ chưa được xử lý — hồ sơ đã ACTIONED thì
// đường đi tiếp là khiếu nại hoặc gỡ biện pháp, không phải quyết định lại.
function DecisionForm({ caseId, onDone }) {
	const toast = useToast();
	const [action, setAction] = useState(null);
	const [note, setNote] = useState("");
	const [suspendDays, setSuspendDays] = useState(7);
	const [saving, setSaving] = useState(false);

	const needsDays = action === "SUSPEND_ACCOUNT";
	const isAccountLevel = ACCOUNT_LEVEL_ACTIONS.has(action);

	const submit = async () => {
		if (!action || saving) return;
		setSaving(true);
		try {
			const updated = await api.post(endpoints.moderation.cases.decision(caseId), {
				action,
				note: note.trim() || null,
				suspendDays: needsDays ? Number(suspendDays) : null,
			});
			toast.success("Đã áp dụng quyết định.");
			onDone(updated);
		} catch (e) {
			// Backend fail closed: nếu thực thi lỗi thì hồ sơ KHÔNG chuyển sang
			// ACTIONED, nên báo lỗi ở đây là báo đúng — chưa có gì được áp dụng.
			toast.error(e?.message || "Không áp dụng được quyết định.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-3">
			<div className="space-y-1">
				{MODERATION_ACTIONS.map((a) => {
					const selected = action === a.value;
					return (
						<button
							key={a.value}
							type="button"
							onClick={() => setAction(a.value)}
							aria-pressed={selected}
							className={cn(
								"flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors",
								selected ? "bg-accent/10" : "hover:bg-hover",
							)}
						>
							<span
								className={cn(
									"mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
									selected ? "border-accent bg-accent" : "border-line",
								)}
							/>
							<span className="min-w-0">
								<span className="block text-sm text-ink">{a.label}</span>
								<span className="mt-0.5 block text-xs text-muted">{a.hint}</span>
							</span>
						</button>
					);
				})}
			</div>

			{needsDays && (
				<div>
					<label
						htmlFor="suspend-days"
						className="mb-1 block text-xs font-semibold text-muted"
					>
						Số ngày khoá (1–365)
					</label>
					<input
						id="suspend-days"
						type="number"
						min={1}
						max={365}
						value={suspendDays}
						onChange={(e) => setSuspendDays(e.target.value)}
						className="h-9 w-28 rounded border border-line bg-canvas px-3 text-sm text-ink"
					/>
				</div>
			)}

			{isAccountLevel && (
				<div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3">
					<Warning size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
					<p className="text-xs leading-relaxed text-red-700 dark:text-red-300">
						Biện pháp này khoá tài khoản ngay lập tức: mọi phiên đăng nhập của họ mất
						hiệu lực ở request kế tiếp, và họ sẽ <strong>không gọi được API khiếu nại</strong>.
						Nếu về sau cần sửa, dùng nút &ldquo;Gỡ biện pháp&rdquo; trên hồ sơ này.
					</p>
				</div>
			)}

			<Textarea
				label="Ghi chú quyết định"
				rows={3}
				maxLength={2000}
				value={note}
				onChange={(e) => setNote(e.target.value)}
				placeholder="Căn cứ và lý do — ghi chú này vào nhật ký kiểm toán."
			/>

			<Button onClick={submit} disabled={!action} loading={saving} className="w-full">
				<Gavel size={16} />
				Áp dụng quyết định
			</Button>
		</div>
	);
}

function RevertPanel({ caseId, onDone }) {
	const toast = useToast();
	const [reason, setReason] = useState("");
	const [saving, setSaving] = useState(false);

	const submit = async () => {
		if (!reason.trim() || saving) return;
		setSaving(true);
		try {
			const updated = await api.post(endpoints.moderation.cases.revert(caseId), {
				reason: reason.trim(),
			});
			toast.success("Đã gỡ biện pháp.");
			onDone(updated);
		} catch (e) {
			toast.error(e?.message || "Không gỡ được biện pháp.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="space-y-3">
			<p className="text-xs leading-relaxed text-muted">
				Gỡ biện pháp đã áp dụng và khôi phục nội dung hoặc tài khoản. Đây là đường duy
				nhất để sửa một lệnh khoá nhầm, vì người bị khoá không tự khiếu nại được.
			</p>
			<Textarea
				label="Lý do gỡ"
				rows={2}
				maxLength={2000}
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder="Bắt buộc — ghi vào nhật ký kiểm toán."
			/>
			<Button
				variant="outline"
				onClick={submit}
				disabled={!reason.trim()}
				loading={saving}
				className="w-full"
			>
				<ArrowUUpLeft size={16} />
				Gỡ biện pháp
			</Button>
		</div>
	);
}

function AppealPanel({ appeal, onReviewed }) {
	const toast = useToast();
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(null); // "UPHELD" | "OVERTURNED"

	const review = async (decision) => {
		if (saving) return;
		setSaving(decision);
		try {
			const updated = await api.post(endpoints.moderation.appeals.review(appeal.id), {
				decision,
				note: note.trim() || null,
			});
			toast.success(
				decision === "OVERTURNED"
					? "Đã đảo ngược quyết định."
					: "Đã giữ nguyên quyết định.",
			);
			onReviewed(updated);
		} catch (e) {
			toast.error(e?.message || "Không xét được khiếu nại.");
		} finally {
			setSaving(null);
		}
	};

	const pending = appeal.status === "PENDING";

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge tone={APPEAL_STATUS_TONES[appeal.status]}>
					{APPEAL_STATUS_LABELS[appeal.status] || appeal.status}
				</Badge>
				<span className="text-xs text-muted">{timeAgo(appeal.createdAt)}</span>
			</div>

			<div>
				<p className="text-xs font-semibold text-muted">Lý do khiếu nại</p>
				<p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-fill p-3 text-sm text-ink">
					{appeal.reason}
				</p>
			</div>

			{appeal.reviewNote && (
				<div>
					<p className="text-xs font-semibold text-muted">Ghi chú của người xét</p>
					<p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
						{appeal.reviewNote}
					</p>
				</div>
			)}

			{pending && (
				<>
					<Textarea
						label="Ghi chú xét khiếu nại"
						rows={2}
						maxLength={2000}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Không bắt buộc."
					/>
					<div className="flex gap-2">
						<Button
							variant="secondary"
							className="flex-1"
							onClick={() => review("UPHELD")}
							loading={saving === "UPHELD"}
							disabled={saving === "OVERTURNED"}
						>
							Giữ nguyên
						</Button>
						<Button
							className="flex-1"
							onClick={() => review("OVERTURNED")}
							loading={saving === "OVERTURNED"}
							disabled={saving === "UPHELD"}
						>
							Đảo ngược
						</Button>
					</div>
				</>
			)}
		</div>
	);
}

export default function CaseDetailPage() {
	const { caseId } = useParams();
	const navigate = useNavigate();
	const toast = useToast();

	const [detail, setDetail] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [assigning, setAssigning] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setDetail(await api.get(endpoints.moderation.cases.byId(caseId)));
		} catch (e) {
			setError(e?.message || "Không tải được hồ sơ.");
		} finally {
			setLoading(false);
		}
	}, [caseId]);

	useEffect(() => {
		load();
	}, [load]);

	// Quyết định / gỡ / xét khiếu nại đều kéo theo nhật ký kiểm toán mới và có thể
	// đổi cả trạng thái nội dung, nên nạp lại toàn bộ hồ sơ thay vì vá tại chỗ.
	const refreshAfterAction = useCallback(() => load(), [load]);

	const assign = async () => {
		if (assigning) return;
		setAssigning(true);
		try {
			await api.post(endpoints.moderation.cases.assign(caseId));
			toast.success("Bạn đã nhận xử lý hồ sơ này.");
			await load();
		} catch (e) {
			toast.error(e?.message || "Không nhận được hồ sơ.");
		} finally {
			setAssigning(false);
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<Spinner size={26} className="text-muted" />
			</div>
		);
	}

	if (error || !detail?.moderationCase) {
		return (
			<div className="mx-auto max-w-[900px] px-4 py-16 text-center">
				<p className="text-sm text-muted">{error || "Không tìm thấy hồ sơ."}</p>
				<Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(-1)}>
					Quay lại
				</Button>
			</div>
		);
	}

	const c = detail.moderationCase;
	const decided = Boolean(c.action) && c.status !== "OPEN" && c.status !== "IN_REVIEW";
	const canDecide = c.status === "OPEN" || c.status === "IN_REVIEW";
	const canRevert = c.status === "ACTIONED";

	return (
		<div className="mx-auto max-w-[1000px] px-4 pb-16 pt-4 md:pt-[30px]">
			<Link
				to="/admin/moderation"
				className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
			>
				<ArrowLeft size={16} />
				Hàng đợi kiểm duyệt
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
				<div className="min-w-0">
					<h1 className="text-2xl font-bold text-ink">
						Hồ sơ {TARGET_TYPE_LABELS[c.targetType]?.toLowerCase() || c.targetType}
					</h1>
					<p className="mt-0.5 break-all text-xs text-muted">
						{c.id} · mở {timeAgo(c.createdAt)} · {c.reportCount} báo cáo
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					<Badge tone={CASE_STATUS_TONES[c.status]}>
						{CASE_STATUS_LABELS[c.status] || c.status}
					</Badge>
					<Badge tone={SEVERITY_TONES[c.severity]}>
						{SEVERITY_LABELS[c.severity] || c.severity}
					</Badge>
				</div>
			</div>

			<div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
				{/* Cột trái: bằng chứng */}
				<div className="space-y-4">
					<Section title="Nội dung bị báo cáo" icon={Flag}>
						<ReportedContent targetType={c.targetType} content={detail.content} />
					</Section>

					<Section title={`Báo cáo đã gộp (${detail.reports?.length ?? 0})`} icon={Flag}>
						<ReportList reports={detail.reports} />
					</Section>

					<Section title="Nhật ký kiểm toán" icon={ClockCounterClockwise}>
						<AuditTimeline logs={detail.auditLogs} />
					</Section>
				</div>

				{/* Cột phải: hành động */}
				<div className="space-y-4">
					{decided && (
						<Section title="Quyết định hiện tại" icon={Gavel}>
							<p className="text-sm font-semibold text-ink">
								{MODERATION_ACTION_LABELS[c.action] || c.action}
							</p>
							{c.decisionNote && (
								<p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">
									{c.decisionNote}
								</p>
							)}
							<p className="mt-2 text-xs text-faint">
								{c.decidedAt ? postDate(c.decidedAt) : ""}
								{c.decidedBy ? ` · ${c.decidedBy}` : ""}
							</p>
							{c.suspendedUntil && (
								<p className="mt-1 text-xs text-muted">
									Khoá đến {postDate(c.suspendedUntil)}
								</p>
							)}
						</Section>
					)}

					{canDecide && (
						<Section title="Ra quyết định" icon={Gavel}>
							{!c.assigneeId && (
								<Button
									variant="secondary"
									className="mb-3 w-full"
									onClick={assign}
									loading={assigning}
								>
									Nhận xử lý hồ sơ
								</Button>
							)}
							<DecisionForm caseId={c.id} onDone={refreshAfterAction} />
						</Section>
					)}

					{detail.appeal && (
						<Section title="Khiếu nại" icon={Warning}>
							<AppealPanel appeal={detail.appeal} onReviewed={refreshAfterAction} />
						</Section>
					)}

					{canRevert && (
						<Section title="Gỡ biện pháp" icon={ArrowUUpLeft}>
							<RevertPanel caseId={c.id} onDone={refreshAfterAction} />
						</Section>
					)}
				</div>
			</div>
		</div>
	);
}
