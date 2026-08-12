# ChillNet — Ma trận đối chiếu tiêu chí xây dựng mạng xã hội

Đối chiếu ChillNet với bộ tiêu chí 17 mục, kèm **file chứng minh** cho từng dòng để
người đọc kiểm chứng được thay vì phải tin.

Ký hiệu: ✅ đạt · 🟡 một phần · ❌ chưa có

---

## 3.1 Tài khoản và danh tính — 🟡

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Đăng ký email | ✅ | `identity-service/.../AuthenticationController.java` `/auth/registration` |
| Đăng nhập / đăng xuất / duy trì phiên | ✅ | `AuthenticationService`, thu hồi qua bảng `InvalidatedToken` |
| Xác minh email (OTP) | ✅ | `OtpService.java`, `/auth/verify-user`, `/auth/resend-verification` |
| Quên & đặt lại mật khẩu | ✅ | `/auth/forgot-password`, `/auth/reset-password` |
| Đổi mật khẩu | ✅ | `UserController` `PUT /users/change-password` |
| Đăng nhập liên kết (Google) | ✅ | `OAuth2Service.java` |
| Refresh token | ✅ | `/auth/refresh` |
| Khoá / vô hiệu hoá tài khoản | ✅ | `AccountStatus` ACTIVE/SUSPENDED/BANNED + `AccountModerationService.assertUsable` |
| Chống brute-force đăng nhập | ✅ | `api-gateway/.../RateLimitFilter.java` — 5 lần/phút cho `/auth/token` |
| Đăng ký bằng số điện thoại | ❌ | — |
| MFA / 2FA | ❌ | — |
| Quản lý thiết bị, đăng xuất từ xa | ❌ | — |
| Người dùng tự xoá tài khoản | ❌ | — |
| Xác minh danh tính (tick xanh) | ❌ | — |
| Phát hiện tài khoản giả / bot | ❌ | — |

**Điểm nổi bật:** `JwtService.verifyToken` gọi `assertUsable(subject)` ở mỗi lần introspect,
nên tài khoản bị khoá mất phiên ngay lập tức thay vì chờ token hết hạn. Đổi lại là một
`SELECT` cho mỗi request qua gateway — đánh đổi có chủ đích, không phải sơ suất.

## 3.2 Hồ sơ người dùng — 🟡

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Tên, ảnh đại diện, ảnh bìa, giới thiệu | ✅ | `profile-service/.../entity/Profile.java` |
| Thông tin liên hệ, nơi ở, website | ✅ | cùng file |
| Danh sách bài viết / ảnh trên hồ sơ | ✅ | `frontend/src/features/profile/` |
| Cài đặt hiển thị từng trường | ❌ | — |
| Chặn tìm kiếm bằng email / SĐT | ❌ | — |
| Chế độ hồ sơ công khai/bạn bè/riêng tư | ❌ | — |
| Trạng thái xác minh | ❌ | — |

## 3.3 Quan hệ xã hội — ✅

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Kết bạn hai chiều (gửi/chấp nhận/từ chối/huỷ) | ✅ | `social-service/.../FriendshipController.java` |
| Theo dõi một chiều | ✅ | `FollowController.java` |
| Chặn người dùng | ✅ | `UserBlockController.java` |
| Bạn chung | ✅ | `/friendships/mutual/{friendId}` |
| Gợi ý kết bạn | ✅ | `/friendships/suggested` |
| Hạn chế (restrict) | ❌ | — |
| Danh sách bạn thân | ❌ | — |
| Đồng bộ danh bạ | ❌ | — |

## 3.4 Đăng và quản lý nội dung — 🟡

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Bài viết văn bản | ✅ | `post-service/.../PostController.java` |
| Ảnh và album nhiều ảnh | ✅ | `Post.imageUrls`, upload qua `file-service` + MinIO |
| Chỉnh sửa bài viết | ✅ | `PUT /posts/{postId}` (bản multipart và bản JSON) |
| Xoá bài viết | ✅ | `DELETE /posts/{postId}` |
| Chia sẻ / đăng lại | ✅ | `SharedPost` — tham chiếu bài gốc, không sao chép |
| Lưu bài | ✅ | `SavedPost`, `/save/{postId}` |
| Quyền xem bài | 🟡 | `PrivacyType` chỉ có PUBLIC / PRIVATE, enforce ở tầng query Mongo |
| Trạng thái nội dung + xoá mềm | ✅ | `ModerationStatus` — gỡ không xoá, khôi phục được |
| Video, story, reels, livestream | ❌ | — |
| Gắn thẻ người dùng, hashtag, vị trí, cảm xúc | ❌ | — |
| Nháp, đặt lịch đăng, tắt bình luận | ❌ | — |
| Tải xuống dữ liệu cá nhân | ❌ | — |

## 3.5 Tương tác — 🟡

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Thích bài viết và bình luận | ✅ | `interaction-service/.../LikeController.java` |
| Bình luận + trả lời lồng nhau | ✅ | `CommentController` `/comments/{id}/replies` |
| Chia sẻ, lưu | ✅ | xem 3.4 |
| **Báo cáo nội dung** | ✅ | `moderation-service` + `frontend/src/features/moderation/ReportModal.jsx` |
| Chống spam báo cáo | ✅ | `RateLimitFilter` — 20 báo cáo/giờ |
| Nhiều loại cảm xúc | ❌ | chỉ một kiểu like |
| Bình chọn, đếm lượt xem | ❌ | — |
| Ẩn bài / bớt xem nội dung tương tự | ❌ | — |
| Phát hiện like ảo, follow ảo | ❌ | — |

## 3.6 Bảng tin và đề xuất — 🔴

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Nguồn: bạn bè + đang theo dõi + bản thân | ✅ | `PostService.getFeed` |
| Loại bỏ người đã chặn | ✅ | cùng hàm, `getBlockedUserIds` |
| Không rò rỉ nội dung đã bị kiểm duyệt | ✅ | `isDistributable` / `isViewableBy` áp ở mọi đường đọc |
| Feed nhóm, feed khám phá | ✅ | `/posts/group/{groupId}`, `/posts/public` |
| Xếp hạng theo tín hiệu | ❌ | thuần `Sort.by("createdDate").descending()` |
| Đa dạng hoá, giải thích đề xuất, tắt cá nhân hoá | ❌ | chưa có thuật toán để giải thích |
| Quảng cáo | ❌ | — |

## 3.7 Nhắn tin — 🟡

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Chat 1-1 và chat nhóm | ✅ | `chat-service/.../ConversationController.java` |
| Thời gian thực | ✅ | STOMP over WebSocket, `WebSocketConfig` |
| Xác thực khi kết nối | ✅ | `WebSocketAuthInterceptor` lấy JWT từ CONNECT frame |
| Đã xem | ✅ | `ReadReceipt`, `/messages/{id}/read` |
| Đang nhập | ✅ | `@MessageMapping("/chat.typing")` |
| Sửa / xoá tin nhắn, quản trị nhóm chat | ✅ | `ChatMessageController`, `ConversationController` |
| Gửi ảnh / video / tệp | ❌ | `ChatMessage` chỉ có trường `message` dạng text |
| Trả lời, chuyển tiếp, ghim, tìm kiếm tin nhắn | ❌ | — |
| Gọi thoại / video | ❌ | — |
| Mã hoá đầu cuối | ❌ | **không tuyên bố có** — xem `PrivacyPolicyPage.jsx` |

## 3.8 Tìm kiếm — 🟡

Tìm người dùng, bài viết, nhóm, bạn bè đều có (`POST /profile/users/search`,
`GET /post/search`, `GET /group/groups/search`). Chưa có công cụ tìm kiếm chuyên dụng
(ES/OpenSearch) — truy vấn chạy thẳng trên MySQL/Mongo. Chưa hỗ trợ hashtag, địa điểm,
tiếng Việt không dấu, sửa lỗi chính tả, gợi ý xu hướng.

## 3.9 Thông báo — 🟡

Có thông báo trong ứng dụng (`Notification` với các type FRIEND_REQUEST / POST_LIKE /
POST_COMMENT / MESSAGE), đánh dấu đã đọc, đếm chưa đọc, và email qua Brevo (fire-and-forget,
nuốt lỗi để không làm hỏng luồng đăng ký). Chưa có push (FCM/Web Push), bật/tắt từng loại,
chọn kênh, không làm phiền, gộp thông báo.

---

## 4. Kiểm duyệt và an toàn cộng đồng — ✅ (điểm mạnh nhất)

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Chính sách nội dung công khai | ✅ | `frontend/src/features/policies/CommunityPolicyPage.jsx` |
| Người dùng báo cáo | ✅ | `ReportController` + `ReportModal.jsx` (12 lý do) |
| Phân loại mức độ | ✅ | `CaseSeverity`, tự leo thang khi đủ 5 báo cáo |
| Gộp báo cáo trùng | ✅ | `ReportService` — cùng target về một `ModerationCase` |
| Kiểm tra tự động trước khi đăng | ✅ | `ai-service` (Python/FastAPI) — fail open, chỉ chặn khi HIGH |
| Kiểm duyệt thủ công | ✅ | `/cases/{id}/assign`, `/cases/{id}/decision` + `frontend/src/features/admin/` |
| Thang biện pháp đầy đủ | ✅ | `ModerationAction` — 7 mức từ WARN đến BAN_ACCOUNT |
| Giảm phân phối (không gỡ hẳn) | ✅ | `LIMIT_DISTRIBUTION` + `isDistributable` |
| Thông báo cho bên liên quan | ✅ | tab &ldquo;Xử lý với tôi&rdquo; trong `MyReportsPage.jsx` |
| Cho phép khiếu nại | ✅ | `AppealController` + `AppealModal` |
| Đánh giá lại | ✅ | `/appeals/{id}/review` — UPHELD / OVERTURNED |
| Lưu nhật ký (kiểm toán được) | ✅ | `AuditLog` + `AuditAction` (9 loại), chỉ ghi thêm |
| Không đóng hồ sơ khi chưa thi hành xong | ✅ | fail closed — `ENFORCEMENT_FAILED` giữ hồ sơ chưa ACTIONED |
| Sửa được quyết định sai | ✅ | `/cases/{id}/revert` |
| Chuyển hồ sơ pháp lý | ❌ | — |

**Đã kiểm chứng đầu-cuối:** báo cáo → gộp hồ sơ → nhận xử lý → quyết định HIDE_CONTENT →
bài biến mất khỏi feed công khai → khiếu nại → đảo ngược → bài quay lại, kèm 8 sự kiện
trong nhật ký kiểm toán.

**Hạn chế đã biết:** tài khoản bị SUSPENDED/BANNED sẽ 401 ở mọi request nên **không tự
khiếu nại được**; đường sửa duy nhất là `/cases/{id}/revert` của quản trị viên.

---

## 5. Tiêu chí phi chức năng — 🔴

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Health check | ✅ | Actuator `/actuator/health` trên cả 11 service |
| Rate limiting | ✅ | `RateLimitFilter` — cửa sổ cố định theo IP + nhóm endpoint |
| Log tập trung | 🟡 | mỗi service ghi ra `logs/<service>.log`, chưa gom |
| Metrics / tracing / dashboard | ❌ | chưa có Prometheus, Grafana, OpenTelemetry |
| Cache (Redis) | ❌ | — |
| Message broker | ❌ | đã gỡ Kafka, toàn bộ liên lạc là Feign đồng bộ |
| Circuit breaker / retry / DLQ | ❌ | — |
| Chế độ suy giảm khi một service lỗi | 🟡 | chỉ AI moderation fail-open; các luồng khác lỗi là hỏng |
| Backup / khôi phục | ❌ | — |
| Kiểm thử (unit/integration/load/security) | ❌ | 11 file test, toàn bộ là `contextLoads` |

## 8. Bảo mật — 🟡

| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Mật khẩu băm | ✅ | BCrypt |
| Token có thời hạn + thu hồi phiên | ✅ | `InvalidatedToken` |
| Kiểm tra quyền ở backend | ✅ | `@PreAuthorize("hasRole('ADMIN')")` — đã xác minh user thường nhận 403 |
| Giới hạn đăng nhập sai | ✅ | `RateLimitFilter` |
| Validate upload (MIME + kích thước) | ✅ | `ImageService` — 5 loại ảnh, tối đa 20MB |
| Chống XSS | ✅ | React escape mặc định, không dùng `dangerouslySetInnerHTML` |
| **Downstream không verify chữ ký JWT** | ⚠️ | `CustomJwtDecoder` chỉ parse — bảo mật dựa hoàn toàn vào việc request đi qua gateway |
| `/internal/**` mở trên port service | ⚠️ | `permitAll` trong mọi `SecurityConfig` |
| Credentials trong yaml đã commit | ⚠️ | theo mẫu `${ENV:default}` |
| MFA, phát hiện đăng nhập bất thường, quét file | ❌ | — |

## 9. Quyền riêng tư và quản trị dữ liệu — 🟡

Có bảng kê dữ liệu thu thập, mục đích và nơi lưu cho từng nhóm
(`frontend/src/features/policies/PrivacyPolicyPage.jsx`), nêu rõ ai xem được gì và nói
thẳng là **không có mã hoá đầu cuối**. Chưa có: tải xuống dữ liệu cá nhân, tự xoá tài
khoản, thời hạn lưu trữ tự động, cơ chế đồng ý chi tiết. Chưa đối chiếu đầy đủ NĐ 13/2023,
NĐ 356/2025, NĐ 147/2024.

## 10. Tiêu chí dành cho trẻ em — ❌

Chưa có xác định độ tuổi hay đồng ý của người giám hộ. `Profile.dob` tồn tại nhưng không
được dùng để chặn gì.

## 11. Quản trị và công cụ nội bộ — 🟡

| Tiêu chí | Trạng thái | Chứng minh |
|---|---|---|
| Hàng đợi báo cáo | ✅ | `/admin/moderation` — lọc theo trạng thái và loại đối tượng |
| Dashboard số liệu | ✅ | `/cases/stats` — 7 chỉ số |
| Xem lịch sử xử lý vi phạm | ✅ | timeline `AuditLog` trên màn chi tiết hồ sơ |
| Khoá / mở khoá tài khoản | ✅ | SUSPEND_ACCOUNT / BAN_ACCOUNT + revert |
| Xử lý khiếu nại | ✅ | `/admin/appeals` |
| Quản lý vai trò nội bộ | ✅ | `RoleController`, `PermissionController` |
| Theo dõi hành động quản trị viên | ✅ | `AuditLog.actorId` |
| Lý do truy cập, phê duyệt, phân tách nhiệm vụ | ❌ | — |
| Dashboard gian lận, quản lý sự cố | ❌ | — |

## 12. UX/UI — 🟡

Có: 13+ route, chế độ tối, skeleton, toast, empty state, error boundary, route được bảo vệ,
popup bài viết kiểu Instagram. Chưa có: app di động, đa ngôn ngữ, kiểm thử accessibility,
tối ưu mạng yếu.

## 13. Chỉ số sản phẩm — ❌

Chưa đo DAU/retention. Dữ liệu để tính thời gian xử lý báo cáo **đã có sẵn** trong
`ModerationCase.createdAt`/`decidedAt` và `AuditLog` — đây là chỉ số dễ bổ sung nhất.

## 14. Kiểm thử — 🔴

Chỉ có 11 test `contextLoads`. Bù lại có một kịch bản smoke test đầu-cuối cho luồng
Trust & Safety (22 bước) đã chạy PASS trên stack thật.

## 15. Đối chiếu phạm vi MVP

**Giai đoạn 1 — 12/12 mục có mặt** (một số ở mức tối thiểu):
đăng ký/đăng nhập/xác minh ✅ · hồ sơ ✅ · kết bạn & theo dõi ✅ · đăng văn bản và ảnh ✅ ·
bảng tin theo thời gian ✅ · thích và bình luận ✅ · thông báo cơ bản ✅ · tìm kiếm người
dùng ✅ · chặn và báo cáo ✅ · công cụ kiểm duyệt ✅ · cài đặt quyền riêng tư 🟡 (chỉ ở mức
bài viết) · log, backup, giám sát 🟡 (có log và health, chưa có backup).

**Giai đoạn 2 — 3/8:** chat 1-1 ✅ · chat nhóm ✅ · nhóm cộng đồng ✅ · story, video, feed
xếp hạng, chống spam nâng cao, phân tích hành vi ❌.

**Giai đoạn 3 — 0/8.**

---

## Ba điều nên nói trước trong buổi bảo vệ

1. **12 microservice cho một MVP** đúng là &ldquo;sai lầm số 3&rdquo; trong bộ tiêu chí.
   Đây là lựa chọn có chủ đích để thể hiện năng lực kiến trúc; nếu tối ưu cho tốc độ ra
   sản phẩm thì modular monolith phù hợp hơn.
2. **Downstream không verify chữ ký JWT** — mô hình tin cậy đặt hết vào gateway. Hướng
   khắc phục: verify chữ ký ở từng service, hoặc mTLS giữa các service.
3. **Người bị khoá không tự khiếu nại được** — đã nhận diện và đã có đường vá
   (`/cases/{id}/revert`), nhưng đúng ra nên có kênh khiếu nại không cần đăng nhập.
