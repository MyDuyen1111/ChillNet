import PolicyLayout, { PolicySection } from "./PolicyLayout";

// Bảng dữ liệu thu thập được viết theo đúng những gì code thật sự lưu, không phải
// một mẫu chính sách chung chung. Cột "Nơi lưu" ghi kèm để đối chiếu được với
// service map trong tài liệu kiến trúc.
const DATA_TABLE = [
	{
		group: "Tài khoản",
		fields: "Tên đăng nhập, email, mật khẩu đã băm, trạng thái xác minh, trạng thái tài khoản",
		purpose: "Đăng nhập, khôi phục mật khẩu, thực thi biện pháp kiểm duyệt",
		store: "identity-service · MySQL",
	},
	{
		group: "Hồ sơ",
		fields: "Họ tên, ngày sinh, giới tính, thành phố, quốc gia, giới thiệu, số điện thoại, website, ảnh đại diện, ảnh bìa",
		purpose: "Hiển thị hồ sơ công khai và gợi ý kết nối",
		store: "profile-service · MySQL",
	},
	{
		group: "Quan hệ",
		fields: "Danh sách bạn bè, lời mời, theo dõi, danh sách chặn",
		purpose: "Dựng bảng tin và quyết định ai xem được nội dung của bạn",
		store: "social-service · MySQL",
	},
	{
		group: "Nội dung",
		fields: "Bài viết, ảnh, bình luận, lượt thích, bài đã lưu, bài chia sẻ",
		purpose: "Chức năng cốt lõi của mạng xã hội",
		store: "post-service, interaction-service · MongoDB/MySQL",
	},
	{
		group: "Tin nhắn",
		fields: "Nội dung tin nhắn, thành viên hội thoại, trạng thái đã đọc",
		purpose: "Cung cấp tính năng nhắn tin",
		store: "chat-service · MongoDB",
	},
	{
		group: "Tệp tải lên",
		fields: "Ảnh, tên tệp, kích thước, kiểu MIME",
		purpose: "Lưu trữ và phục vụ ảnh trong bài viết và hồ sơ",
		store: "file-service · MinIO + MongoDB",
	},
	{
		group: "An toàn",
		fields: "Báo cáo đã gửi, hồ sơ kiểm duyệt, khiếu nại, nhật ký kiểm toán",
		purpose: "Xử lý vi phạm và giải trình các quyết định kiểm duyệt",
		store: "moderation-service · MySQL",
	},
];

export default function PrivacyPolicyPage() {
	return (
		<PolicyLayout title="Chính sách quyền riêng tư" updated="09/08/2026">
			<PolicySection title="Phạm vi">
				<p>
					Tài liệu này mô tả dữ liệu ChillNet thu thập, lý do thu thập và quyền của bạn
					đối với dữ liệu đó. ChillNet là sản phẩm học thuật, không bán dữ liệu và không
					chạy quảng cáo.
				</p>
			</PolicySection>

			<PolicySection title="Dữ liệu chúng tôi thu thập">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[560px] border-collapse text-left text-sm">
						<thead>
							<tr className="border-b border-line text-xs uppercase tracking-wide text-faint">
								<th className="py-2 pr-3 font-semibold">Nhóm</th>
								<th className="py-2 pr-3 font-semibold">Trường dữ liệu</th>
								<th className="py-2 pr-3 font-semibold">Mục đích</th>
								<th className="py-2 font-semibold">Nơi lưu</th>
							</tr>
						</thead>
						<tbody>
							{DATA_TABLE.map((row) => (
								<tr key={row.group} className="border-b border-line align-top">
									<td className="py-2.5 pr-3 font-semibold text-ink">
										{row.group}
									</td>
									<td className="py-2.5 pr-3">{row.fields}</td>
									<td className="py-2.5 pr-3">{row.purpose}</td>
									<td className="py-2.5 text-xs text-faint">{row.store}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</PolicySection>

			<PolicySection title="Ai xem được gì">
				<p>
					Bài viết để chế độ <span className="font-semibold text-ink">Công khai</span> ai
					cũng xem được; để <span className="font-semibold text-ink">Riêng tư</span> thì
					chỉ mình bạn. Bảng tin chỉ lấy bài của bạn bè và những người bạn theo dõi, và
					luôn loại bỏ người bạn đã chặn.
				</p>
				<p>
					Tin nhắn chỉ hiển thị cho các thành viên trong hội thoại. Lưu ý:{" "}
					<span className="font-semibold text-ink">
						ChillNet không dùng mã hoá đầu cuối
					</span>
					. Dữ liệu được bảo vệ ở tầng máy chủ và cơ sở dữ liệu, nghĩa là quản trị viên
					hệ thống về mặt kỹ thuật vẫn có thể truy cập cơ sở dữ liệu. Chúng tôi nói rõ
					điều này thay vì tuyên bố một mức bảo mật mà hệ thống chưa đạt được.
				</p>
			</PolicySection>

			<PolicySection title="Kiểm duyệt và dữ liệu của bạn">
				<p>
					Khi bạn báo cáo một nội dung, danh tính của bạn không được tiết lộ cho người bị
					báo cáo. Khi một nội dung của bạn bị xử lý, quyết định và lý do sẽ hiện trong
					mục Báo cáo của tôi.
				</p>
				<p>
					Nội dung bị gỡ được đánh dấu ẩn chứ không bị xoá khỏi cơ sở dữ liệu, để phục vụ
					việc khiếu nại và đối chiếu về sau.
				</p>
			</PolicySection>

			<PolicySection title="Quyền của bạn">
				<ul className="ml-4 list-disc space-y-1">
					<li>Xem và chỉnh sửa hồ sơ của bạn bất cứ lúc nào.</li>
					<li>Xoá bài viết và bình luận bạn đã đăng.</li>
					<li>Chặn người dùng khác để họ không tương tác được với bạn.</li>
					<li>Khiếu nại mọi quyết định kiểm duyệt áp dụng lên bạn.</li>
					<li>Yêu cầu xoá tài khoản bằng cách liên hệ quản trị viên.</li>
				</ul>
			</PolicySection>

			<PolicySection title="Những gì chưa làm được">
				<p>
					Đây là bản triển khai học thuật, và chúng tôi nêu rõ giới hạn thay vì hứa quá
					khả năng. Các mục sau <span className="font-semibold text-ink">chưa</span> có:
					tải xuống toàn bộ dữ liệu cá nhân theo yêu cầu, tự xoá tài khoản trong ứng
					dụng, cài đặt quyền riêng tư chi tiết cho từng trường hồ sơ, chính sách thời
					hạn lưu trữ tự động, và xác minh độ tuổi.
				</p>
				<p>
					Trước khi vận hành thực tế tại Việt Nam, hệ thống cần được đối chiếu đầy đủ với
					Nghị định 13/2023/NĐ-CP, Nghị định 356/2025/NĐ-CP và Nghị định 147/2024/NĐ-CP.
				</p>
			</PolicySection>
		</PolicyLayout>
	);
}
