import { useEffect, useState } from "react";
import { CheckCircle, ShieldWarning } from "@phosphor-icons/react";
import { Button, Modal, Textarea, useToast } from "../../components/ui";
import api from "../../lib/api";
import endpoints from "../../lib/endpoints";
import { cn } from "../../lib/cn";
import { REPORT_REASONS, TARGET_TYPE_LABELS } from "./constants";

// Hộp thoại báo cáo dùng chung cho bài viết, bình luận, tài khoản và nhóm.
//
// Backend gộp mọi báo cáo trên cùng một đối tượng vào MỘT hồ sơ và tự leo thang
// mức nghiêm trọng khi đủ 5 báo cáo, nên phía client không cần chống gửi trùng —
// chỉ cần báo cho người dùng biết báo cáo đã được ghi nhận.
export default function ReportModal({ open, onClose, targetType, targetId, targetLabel }) {
	const toast = useToast();
	const [reason, setReason] = useState(null);
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState(false);

	// Mở lại hộp thoại cho một đối tượng khác thì phải quên lựa chọn cũ, nếu
	// không người dùng sẽ thấy lý do của lần báo cáo trước còn được chọn sẵn.
	useEffect(() => {
		if (!open) return;
		setReason(null);
		setDescription("");
		setDone(false);
		setSubmitting(false);
	}, [open, targetId]);

	const submit = async () => {
		if (!reason || submitting) return;
		setSubmitting(true);
		try {
			await api.post(endpoints.moderation.reports.create, {
				targetType,
				targetId,
				reason,
				description: description.trim() || null,
			});
			setDone(true);
		} catch (err) {
			toast.error(err?.message || "Không gửi được báo cáo, thử lại sau.");
			setSubmitting(false);
		}
	};

	const what = targetLabel || TARGET_TYPE_LABELS[targetType] || "nội dung này";

	return (
		<Modal
			open={open}
			onClose={() => !submitting && onClose()}
			title={done ? "Đã nhận báo cáo" : "Báo cáo"}
			size="md"
		>
			{done ? (
				<div className="flex flex-col items-center py-4 text-center">
					<CheckCircle size={48} weight="fill" className="text-emerald-500" />
					<p className="mt-4 text-sm font-semibold text-ink">
						Cảm ơn bạn đã báo cáo.
					</p>
					<p className="mt-1.5 max-w-sm text-sm text-muted">
						Đội ngũ kiểm duyệt sẽ xem xét {what.toLowerCase()} này. Bạn có thể theo dõi
						kết quả xử lý ở mục <span className="font-semibold text-ink">Báo cáo của tôi</span>.
					</p>
					<Button className="mt-5" onClick={onClose}>
						Xong
					</Button>
				</div>
			) : (
				<>
					<div className="mb-4 flex items-start gap-2.5 rounded-lg bg-fill p-3">
						<ShieldWarning size={18} className="mt-0.5 shrink-0 text-muted" />
						<p className="text-xs leading-relaxed text-muted">
							Báo cáo của bạn được gửi ẩn danh — người bị báo cáo không biết ai đã gửi.
							Nhiều báo cáo về cùng một đối tượng sẽ được gộp vào một hồ sơ.
						</p>
					</div>

					<p className="mb-2 text-sm font-semibold text-ink">
						Vì sao bạn báo cáo {what.toLowerCase()} này?
					</p>

					<div className="-mx-1 max-h-[38vh] space-y-0.5 overflow-y-auto px-1">
						{REPORT_REASONS.map((r) => {
							const selected = reason === r.value;
							return (
								<button
									key={r.value}
									type="button"
									onClick={() => setReason(r.value)}
									aria-pressed={selected}
									className={cn(
										"flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
										selected ? "bg-accent/10" : "hover:bg-hover",
									)}
								>
									<span
										className={cn(
											"mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
											selected ? "border-accent bg-accent" : "border-line",
										)}
									/>
									<span className="min-w-0">
										<span
											className={cn(
												"block text-sm",
												selected
													? "font-semibold text-ink"
													: "text-ink",
											)}
										>
											{r.label}
										</span>
										<span className="mt-0.5 block text-xs text-muted">
											{r.hint}
										</span>
									</span>
								</button>
							);
						})}
					</div>

					<div className="mt-4">
						<label
							htmlFor="report-description"
							className="mb-1.5 block text-xs font-semibold text-muted"
						>
							Mô tả thêm {reason === "OTHER" ? "(nên có)" : "(không bắt buộc)"}
						</label>
						<Textarea
							id="report-description"
							rows={3}
							maxLength={1000}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Cho kiểm duyệt viên biết thêm ngữ cảnh..."
						/>
						<p className="mt-1 text-right text-xs text-faint">
							{description.length}/1000
						</p>
					</div>

					<div className="mt-4 flex justify-end gap-2">
						<Button variant="ghost" onClick={onClose} disabled={submitting}>
							Huỷ
						</Button>
						<Button onClick={submit} disabled={!reason} loading={submitting}>
							Gửi báo cáo
						</Button>
					</div>
				</>
			)}
		</Modal>
	);
}
