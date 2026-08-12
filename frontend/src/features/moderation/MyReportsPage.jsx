import { useState } from "react";
import { Flag, Scales, ShieldCheck } from "@phosphor-icons/react";
import { Button, Card, EmptyState, Modal, Spinner, Textarea, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { postDate, timeAgo } from "../../lib/format";
import Badge from "./components/Badge";
import { usePagedList } from "./usePagedList";
import {
	APPEALABLE_CASE_STATUSES,
	APPEAL_STATUS_LABELS,
	APPEAL_STATUS_TONES,
	CASE_STATUS_LABELS,
	CASE_STATUS_TONES,
	MODERATION_ACTION_LABELS,
	REPORT_REASON_LABELS,
	REPORT_STATUS_LABELS,
	TARGET_TYPE_LABELS,
} from "./constants";

const TABS = [
	{ key: "reports", label: "Báo cáo đã gửi" },
	{ key: "cases", label: "Xử lý với tôi" },
	{ key: "appeals", label: "Khiếu nại của tôi" },
];

function ListShell({ state, emptyIcon, emptyTitle, emptyDescription, children }) {
	const { items, loading, loadingMore, hasNext, error, loadMore, reload } = state;

	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<Spinner size={24} className="text-muted" />
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
				<p className="text-sm text-muted">{error}</p>
				<Button variant="outline" size="sm" onClick={reload}>
					Thử lại
				</Button>
			</div>
		);
	}
	if (items.length === 0) {
		return (
			<EmptyState
				icon={emptyIcon}
				title={emptyTitle}
				description={emptyDescription}
			/>
		);
	}
	return (
		<>
			{children}
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
	);
}

function AppealModal({ open, onClose, caseId, onCreated }) {
	const toast = useToast();
	const [reason, setReason] = useState("");
	const [saving, setSaving] = useState(false);

	const submit = async () => {
		if (!reason.trim() || saving) return;
		setSaving(true);
		try {
			await api.post(endpoints.moderation.appeals.create, {
				caseId,
				reason: reason.trim(),
			});
			toast.success("Đã gửi khiếu nại. Chúng tôi sẽ xem xét lại.");
			setReason("");
			onCreated();
			onClose();
		} catch (e) {
			toast.error(e?.message || "Không gửi được khiếu nại.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal open={open} onClose={() => !saving && onClose()} title="Khiếu nại quyết định" size="md">
			<p className="mb-3 text-sm text-muted">
				Cho chúng tôi biết vì sao bạn cho rằng quyết định này chưa đúng. Mỗi hồ sơ chỉ
				khiếu nại được một lần.
			</p>
			<Textarea
				rows={5}
				maxLength={2000}
				value={reason}
				onChange={(e) => setReason(e.target.value)}
				placeholder="Trình bày lý do của bạn..."
			/>
			<div className="mt-4 flex justify-end gap-2">
				<Button variant="ghost" onClick={onClose} disabled={saving}>
					Huỷ
				</Button>
				<Button onClick={submit} disabled={!reason.trim()} loading={saving}>
					Gửi khiếu nại
				</Button>
			</div>
		</Modal>
	);
}

function ReportsTab() {
	const state = usePagedList(endpoints.moderation.reports.mine, {});

	return (
		<ListShell
			state={state}
			emptyIcon={Flag}
			emptyTitle="Bạn chưa gửi báo cáo nào"
			emptyDescription="Khi bạn báo cáo một bài viết hoặc bình luận, trạng thái xử lý sẽ hiện ở đây."
		>
			{state.items.map((r) => (
				<div key={r.id} className="border-b border-line px-4 py-3 last:border-b-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-sm font-semibold text-ink">
							{REPORT_REASON_LABELS[r.reason] || r.reason}
						</span>
						<Badge>{TARGET_TYPE_LABELS[r.targetType] || r.targetType}</Badge>
						<Badge>{REPORT_STATUS_LABELS[r.status] || r.status}</Badge>
					</div>
					{r.description && (
						<p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">
							{r.description}
						</p>
					)}
					<p className="mt-1 text-xs text-faint">{timeAgo(r.createdAt)}</p>
				</div>
			))}
		</ListShell>
	);
}

function CasesTab() {
	const state = usePagedList(endpoints.moderation.cases.againstMe, {});
	const [appealFor, setAppealFor] = useState(null);

	return (
		<>
			<ListShell
				state={state}
				emptyIcon={ShieldCheck}
				emptyTitle="Không có xử lý nào"
				emptyDescription="Chưa có nội dung hay tài khoản nào của bạn bị áp dụng biện pháp kiểm duyệt."
			>
				{state.items.map((c) => {
					const appealable = APPEALABLE_CASE_STATUSES.has(c.status);
					return (
						<div key={c.id} className="border-b border-line px-4 py-3 last:border-b-0">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-sm font-semibold text-ink">
									{TARGET_TYPE_LABELS[c.targetType] || c.targetType}
								</span>
								<Badge tone={CASE_STATUS_TONES[c.status]}>
									{CASE_STATUS_LABELS[c.status] || c.status}
								</Badge>
							</div>

							{c.action && c.action !== "NONE" && (
								<p className="mt-1 text-sm text-ink">
									Biện pháp:{" "}
									<span className="font-semibold">
										{MODERATION_ACTION_LABELS[c.action] || c.action}
									</span>
								</p>
							)}
							{c.decisionNote && (
								<p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">
									{c.decisionNote}
								</p>
							)}
							{c.suspendedUntil && (
								<p className="mt-1 text-xs text-muted">
									Khoá đến {postDate(c.suspendedUntil)}
								</p>
							)}
							<p className="mt-1 text-xs text-faint">
								{c.decidedAt ? postDate(c.decidedAt) : timeAgo(c.createdAt)}
							</p>

							{appealable && (
								<Button
									variant="outline"
									size="sm"
									className="mt-2"
									onClick={() => setAppealFor(c.id)}
								>
									Khiếu nại quyết định
								</Button>
							)}
						</div>
					);
				})}
			</ListShell>

			<AppealModal
				open={Boolean(appealFor)}
				caseId={appealFor}
				onClose={() => setAppealFor(null)}
				onCreated={state.reload}
			/>
		</>
	);
}

function AppealsTab() {
	const state = usePagedList(endpoints.moderation.appeals.mine, {});

	return (
		<ListShell
			state={state}
			emptyIcon={Scales}
			emptyTitle="Bạn chưa gửi khiếu nại nào"
			emptyDescription="Nếu bạn cho rằng một quyết định chưa đúng, hãy khiếu nại ở tab “Xử lý với tôi”."
		>
			{state.items.map((a) => (
				<div key={a.id} className="border-b border-line px-4 py-3 last:border-b-0">
					<div className="flex flex-wrap items-center gap-2">
						<Badge tone={APPEAL_STATUS_TONES[a.status]}>
							{APPEAL_STATUS_LABELS[a.status] || a.status}
						</Badge>
						<span className="text-xs text-muted">{timeAgo(a.createdAt)}</span>
					</div>
					<p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-ink">
						{a.reason}
					</p>
					{a.reviewNote && (
						<p className="mt-1.5 rounded-lg bg-fill p-2.5 text-sm text-muted">
							<span className="font-semibold text-ink">Phản hồi: </span>
							{a.reviewNote}
						</p>
					)}
				</div>
			))}
		</ListShell>
	);
}

export default function MyReportsPage() {
	const [tab, setTab] = useState("reports");

	return (
		<div className="mx-auto max-w-[640px] px-4 pb-16 pt-4 md:pt-[30px]">
			<div className="border-b border-line pb-4">
				<h1 className="text-2xl font-bold text-ink">Báo cáo của tôi</h1>
				<p className="mt-0.5 text-sm text-muted">
					Theo dõi báo cáo bạn đã gửi và các quyết định kiểm duyệt liên quan tới bạn.
				</p>
			</div>

			<div className="flex gap-1.5 py-4">
				{TABS.map((t) => (
					<Button
						key={t.key}
						size="sm"
						variant={tab === t.key ? "primary" : "secondary"}
						onClick={() => setTab(t.key)}
					>
						{t.label}
					</Button>
				))}
			</div>

			<Card flush className="overflow-hidden">
				{tab === "reports" && <ReportsTab />}
				{tab === "cases" && <CasesTab />}
				{tab === "appeals" && <AppealsTab />}
			</Card>
		</div>
	);
}
