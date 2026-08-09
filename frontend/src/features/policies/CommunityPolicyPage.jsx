import PolicyLayout, { PolicySection } from "./PolicyLayout";
import { MODERATION_ACTIONS, REPORT_REASONS } from "../moderation/constants";

// Mỗi lý do báo cáo trong ReportModal phải trỏ được về một điều khoản ở đây —
// nên bảng bên dưới sinh thẳng từ REPORT_REASONS, không chép tay. Thêm một lý do
// mới vào constants.js là nó tự xuất hiện trong chính sách.
const REASON_RULES = {
	SPAM: "Không đăng nội dung lặp lại hàng loạt, liên kết rác hay quảng cáo không mong muốn; không dùng công cụ tự động để tăng tương tác.",
	HARASSMENT:
		"Không nhắm vào một cá nhân bằng lời lẽ xúc phạm, đe doạ, theo dõi dai dẳng hay kêu gọi người khác tấn công họ.",
	HATE_SPEECH:
		"Không công kích hay hạ thấp người khác dựa trên dân tộc, tôn giáo, giới tính, khuyết tật hay các đặc điểm được bảo vệ khác.",
	VIOLENCE:
		"Không đe doạ bạo lực, tổ chức hành vi gây hại hay tôn vinh hành vi bạo lực nghiêm trọng.",
	SEXUAL_CONTENT:
		"Không đăng nội dung khiêu dâm, đặc biệt là nội dung chia sẻ khi chưa có sự đồng ý của người trong đó.",
	SELF_HARM:
		"Không cổ vũ hay hướng dẫn hành vi tự gây hại. Nội dung dạng này được xử lý ưu tiên và kèm thông tin hỗ trợ.",
	CHILD_SAFETY:
		"Tuyệt đối cấm mọi nội dung gây hại cho trẻ em. Đây là nhóm nghiêm trọng nhất và được xử lý trước mọi hàng đợi khác.",
	MISINFORMATION:
		"Không lan truyền thông tin sai có khả năng gây hại thực tế cho sức khoẻ hoặc an toàn của người khác.",
	SCAM: "Không lừa đảo chiếm đoạt tiền hay thông tin cá nhân, không giả mạo chương trình khuyến mãi.",
	IMPERSONATION:
		"Không mạo danh người khác hoặc tổ chức theo cách khiến người xem hiểu nhầm về danh tính bạn.",
	COPYRIGHT: "Chỉ đăng nội dung bạn có quyền sử dụng.",
	OTHER: "Các hành vi gây hại khác không thuộc nhóm trên vẫn có thể bị xử lý sau khi xem xét.",
};

export default function CommunityPolicyPage() {
	return (
		<PolicyLayout title="Tiêu chuẩn cộng đồng ChillNet" updated="09/08/2026">
			<PolicySection title="Nguyên tắc chung">
				<p>
					ChillNet muốn là nơi mọi người chia sẻ thoải mái mà không phải chịu quấy rối,
					lừa đảo hay nội dung gây hại. Tài liệu này nêu rõ điều gì không được phép, và
					chuyện gì xảy ra khi có vi phạm.
				</p>
				<p>
					Các tiêu chuẩn này áp dụng cho mọi nội dung công khai: bài viết, bình luận,
					hồ sơ cá nhân và nhóm.
				</p>
			</PolicySection>

			<PolicySection title="Nội dung không được phép">
				<ul className="space-y-2">
					{REPORT_REASONS.filter((r) => r.value !== "OTHER").map((r) => (
						<li key={r.value}>
							<span className="font-semibold text-ink">{r.label}. </span>
							{REASON_RULES[r.value]}
						</li>
					))}
				</ul>
			</PolicySection>

			<PolicySection title="Cách chúng tôi xử lý">
				<p>
					Nội dung được sàng lọc tự động ngay khi đăng: một mô hình ngôn ngữ đánh giá
					văn bản và chặn trước những trường hợp vi phạm rõ ràng ở mức nghiêm trọng.
					Bước này cố ý &ldquo;nới&rdquo; — khi hệ thống không chắc chắn, nội dung vẫn
					được đăng và chờ con người xem xét, thay vì chặn nhầm người dùng ngay thẳng.
				</p>
				<p>Sau khi đăng, quy trình do con người quyết định:</p>
				<ol className="ml-4 list-decimal space-y-1">
					<li>Người dùng gửi báo cáo.</li>
					<li>
						Các báo cáo về cùng một đối tượng được gộp vào một hồ sơ; mức nghiêm trọng
						tự tăng khi số báo cáo vượt ngưỡng.
					</li>
					<li>Kiểm duyệt viên nhận hồ sơ và xem toàn bộ bằng chứng.</li>
					<li>Quyết định được áp dụng và ghi vào nhật ký kiểm toán.</li>
					<li>Người bị xử lý được khiếu nại và được xem xét lại.</li>
				</ol>
			</PolicySection>

			<PolicySection title="Các mức xử lý">
				<p>
					Biện pháp được chọn tương xứng với mức độ vi phạm, từ nhẹ đến nặng. Nội dung
					bị gỡ <span className="font-semibold text-ink">không bị xoá khỏi hệ thống</span>{" "}
					— nhờ vậy một khiếu nại đúng có thể khôi phục lại nguyên trạng.
				</p>
				<ul className="space-y-1.5">
					{MODERATION_ACTIONS.filter((a) => a.value !== "NONE").map((a) => (
						<li key={a.value}>
							<span className="font-semibold text-ink">{a.label}: </span>
							{a.hint}.
						</li>
					))}
				</ul>
			</PolicySection>

			<PolicySection title="Khiếu nại">
				<p>
					Nếu bạn cho rằng một quyết định chưa đúng, hãy vào mục{" "}
					<span className="font-semibold text-ink">Báo cáo của tôi → Xử lý với tôi</span>{" "}
					và gửi khiếu nại. Mỗi hồ sơ khiếu nại được một lần và sẽ do người khác xem xét
					lại.
				</p>
				<p>
					Nếu tài khoản của bạn đang bị khoá và vì thế không gửi được khiếu nại, hãy liên
					hệ quản trị viên — họ có quyền gỡ biện pháp trực tiếp trên hồ sơ.
				</p>
			</PolicySection>

			<PolicySection title="Báo cáo sai sự thật">
				<p>
					Báo cáo là công cụ an toàn, không phải công cụ để gây bất lợi cho người khác.
					Việc gửi báo cáo hàng loạt hoặc cố ý sai sự thật cũng bị coi là vi phạm tiêu
					chuẩn này.
				</p>
			</PolicySection>
		</PolicyLayout>
	);
}
