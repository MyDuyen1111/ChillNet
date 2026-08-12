# ChillNet — Kế hoạch hoàn thiện trước bảo vệ đồ án

> **Cập nhật 09/08/2026 — phạm vi đã chốt: 2 ngày.**
> Đã làm xong: **P0 toàn bộ** · rate limiting ở gateway · actuator health 11 service ·
> hai trang chính sách · `scripts/seed-demo.py` · `docs/criteria-matrix.md`.
> Đã bỏ theo đúng thứ tự cắt giảm bên dưới: Story, ảnh trong chat, reactions, hashtag,
> đếm lượt xem, quyền riêng tư hồ sơ.
> Phần còn lại của tài liệu này giữ nguyên làm kế hoạch cho giai đoạn sau.


**Bối cảnh:** 1 người, còn vài ngày, mục tiêu là bảo vệ capstone, ưu tiên chiều rộng
(tính năng hội đồng nhìn thấy ngay) hơn chiều sâu kỹ thuật.

**Nguyên tắc chọn việc:** xếp hạng theo `(mức độ nhìn thấy được × số tiêu chí phủ) / giờ công`.
Ưu tiên tuyệt đối cho những thứ **backend đã xong mà frontend chưa lộ ra** — đó là điểm
miễn phí.

**Tổng công:** 5 ngày làm việc. Nếu chỉ còn 3 ngày, cắt theo thứ tự: bỏ P3 trước,
rồi rút gọn P2 xuống còn phần cài đặt thông báo.

---

## P0 — Ngày 1: Lộ diện hệ thống kiểm duyệt  ⭐ ROI cao nhất

`moderation-service` đã hoàn chỉnh 100% ở backend (report → case → decision → enforcement →
appeal → audit log) nhưng **frontend không có một nút nào chạm tới**. Đây là phần mạnh nhất
của đồ án đang vô hình. Chi phí: **0 dòng backend**.

| # | Việc | Nơi làm | Công |
|---|---|---|---|
| 0.1 | Thêm nhóm endpoint `moderation` vào `lib/endpoints.js` | `frontend/src/lib/endpoints.js` | 20p |
| 0.2 | `ReportModal` — chọn 1 trong 12 `ReportReason` + mô tả, gọi `POST /moderation/reports` | `features/moderation/` (mới) | 1.5h |
| 0.3 | Nút "Báo cáo" vào menu `PostCard` và `CommentItem` | `features/feed/components/` | 1h |
| 0.4 | Trang `/admin/moderation` — hàng đợi case, lọc theo `CaseStatus`, badge `reportCount`/`CaseSeverity` | `features/admin/` (mới) | 2.5h |
| 0.5 | Màn chi tiết case — thông tin target, danh sách report đã gộp, nút `assign`, form `decision` (7 `ModerationAction`), timeline `AuditLog`, nút `revert` | `features/admin/` | 2.5h |
| 0.6 | Trang `/appeals` — nộp khiếu nại + xem trạng thái (`/appeals`, `/appeals/my`) | `features/moderation/` | 1h |
| 0.7 | Trang `/my-reports` — `reports/my` + `cases/against-me` | `features/moderation/` | 45p |
| 0.8 | `AdminRoute` guard theo `ROLE_ADMIN` (mở rộng `ProtectedRoute`) | `components/layout/` | 30p |

**Phủ tiêu chí:** §4 toàn bộ quy trình kiểm duyệt · §11 công cụ quản trị · §3.5 báo cáo nội dung
· §12 trạng thái nội dung chờ kiểm duyệt.

> Lưu ý demo: tài khoản bị `SUSPENDED`/`BANNED` sẽ 401 ở mọi request nên **không nộp được
> khiếu nại**. Trong kịch bản demo hãy dùng `POST /cases/{id}/revert` của admin để minh họa,
> và nêu thẳng đây là hạn chế đã biết — hội đồng đánh giá cao việc mình tự chỉ ra.

---

## P1 — Ngày 2: Ba tính năng "nhìn là thấy mạng xã hội"

Backend nhỏ, hiệu ứng thị giác lớn.

### 1.1 Reactions nhiều loại (~3h)
- `Like` thêm cột `type` enum `LIKE|LOVE|HAHA|WOW|SAD|ANGRY`, default `LIKE`
  (`interaction-service/.../entity/Like.java`).
- `LikeService`: đổi reaction thay vì chỉ toggle; trả thêm `Map<type, count>`.
- FE: giữ nút Thích 400ms → hiện picker 6 emoji; hiển thị 3 icon top + tổng số.
- **Phủ §3.5** (nhiều loại cảm xúc).

### 1.2 Hashtag (~3h)
- Parse `#[\p{L}0-9_]+` trong `createPostWithUrls`/`updatePostWithUrls` → lưu
  `List<String> hashtags` vào `Post`, đánh index Mongo.
- `GET /posts/hashtag/{tag}` (tái dùng `isDistributable`) + `GET /posts/hashtags/trending`
  (aggregate top 10 trong 7 ngày).
- FE: linkify `#tag` trong `PostCard`, trang `/hashtag/:tag`, widget "Xu hướng" ở `FeedSidebar`.
- **Phủ §3.4** (hashtag) · **§3.8** (tìm theo hashtag, từ khóa xu hướng).

### 1.3 Đếm lượt xem (~1h)
- `Post.viewCount`, tăng trong `getPostById` (bỏ qua nếu là chủ bài).
- FE hiển thị ở `PostDetailModal`.
- **Phủ §3.5** (đếm lượt xem).

### 1.4 Nếu còn thời gian: tắt bình luận (~1h)
- `Post.commentsDisabled` + chặn ở `CommentService.createComment` qua `/internal/posts/{id}`.
- **Phủ §3.4** (tắt bình luận).

---

## P2 — Ngày 3: Cài đặt & quyền riêng tư

Đây là lỗ hổng tiêu chí nặng nhất hiện tại (§3.2 gần như trắng) và là **sai lầm số 4**
trong danh sách "những sai lầm dễ mắc" — cần đóng lại.

### 2.1 Quyền riêng tư hồ sơ (~3h)
- `Profile` thêm: `profileVisibility` (`PUBLIC|FRIENDS|PRIVATE`), `showEmail`, `showPhone`,
  `searchableByEmail`, `searchableByPhone`. **Mặc định an toàn**: `FRIENDS` + tất cả `false`.
- Áp trong `ProfileService.getProfile` (che trường theo quan hệ, dùng `SocialClient`
  `/internal/friend-ids` đã có sẵn) và trong `POST /users/search`.
- **Phủ §3.2** toàn bộ · **§9** (privacy by design/by default).

### 2.2 Cài đặt thông báo (~2h)
- `NotificationPreference` (Mongo): `userId`, `Map<String,Boolean> types`, `emailEnabled`,
  `dndFrom`/`dndTo`.
- Check trong `NotificationService` trước khi lưu/gửi email.
- **Phủ §3.9** (bật/tắt từng loại, chọn kênh, không làm phiền).

### 2.3 Trang `/settings` gộp (~2h)
Bốn tab: Hồ sơ · Quyền riêng tư · Thông báo · Bảo mật (đổi mật khẩu — API đã có,
xem trạng thái tài khoản + lý do nếu bị hạn chế).

### 2.4 Tùy chọn — `PrivacyType.FRIENDS` (~2h, làm nếu dư giờ)
Chạm 6 query trong `PostRepository`: thêm nhánh `{ privacy: 'FRIENDS', userId: { $in: friendIds } }`.
Rủi ro trung bình vì đụng cả feed/explore/search — **chỉ làm khi P0–P2 đã xanh**.

---

## P3 — Ngày 4: Story + ảnh trong chat

Phần "chiều rộng" đắt nhất nhưng gây ấn tượng mạnh nhất. **Cắt đầu tiên nếu thiếu thời gian.**

### 3.1 Story (~5h) — trong `post-service`
- Document `Story`: `userId`, `imageUrl`, `caption`, `createdDate`, `expiresAt`.
  **TTL index Mongo trên `expiresAt`** → hết 24h tự xóa, không cần job dọn dẹp.
- `StoryView` (`storyId`, `viewerId`) để biết ai đã xem.
- API: `POST /stories`, `GET /stories/feed` (bạn bè + following, gom theo user),
  `POST /stories/{id}/view`.
- FE: thanh avatar vòng tròn gradient trên đầu feed; viewer toàn màn hình có progress bar,
  bấm trái/phải chuyển, danh sách người đã xem cho story của mình.
- **Phủ §3.4** (nội dung ngắn hạn) · giai đoạn 2 của lộ trình MVP.

### 3.2 Ảnh trong tin nhắn (~2h)
- `ChatMessage` thêm `imageUrl` và `type` (`TEXT|IMAGE`).
- FE `Composer` thêm nút ảnh, tái dùng luồng upload qua `file-service` đã chạy.
- **Phủ §3.7** (gửi ảnh).

---

## P4 — Ngày 5: Bảo mật, vận hành, tài liệu

Đây là ngày "trả lời câu hỏi hội đồng". Chi phí rất thấp, giá trị phòng thủ rất cao.

| # | Việc | Công | Phủ |
|---|---|---|---|
| 4.1 | **Rate limiting ở gateway** — một `GlobalFilter` in-memory, bucket theo IP+path: `/auth/token` 5 req/phút, `/auth/registration` 3 req/giờ, mặc định 100 req/phút → trả 429 | 1.5h | §3.5, §8.3, §8.4 |
| 4.2 | **Actuator** — thêm `spring-boot-starter-actuator`, expose `health,info` cho 11 service | 30p | §5.4 |
| 4.3 | **Trang chính sách tĩnh** — `/policies/community` (ánh xạ 12 `ReportReason` sang chính sách) và `/policies/privacy` (thu thập gì · mục đích · lưu bao lâu · quyền của người dùng) | 1.5h | §4.1, §9 |
| 4.4 | **Seed data demo** — script tạo ~8 user, 30 bài có ảnh, comment, reaction, 1 case đang mở, 1 case đã xử lý, 1 khiếu nại chờ duyệt | 1.5h | §12 (demo không rỗng) |
| 4.5 | **`docs/criteria-matrix.md`** — ma trận tiêu chí ↔ trạng thái ↔ file chứng minh | 1h | toàn bộ |

---

## Ngoài phạm vi — đưa vào slide "Hướng phát triển"

Nêu chủ động, kèm lý do, sẽ tốt hơn nhiều so với để hội đồng phát hiện:

- **Video & transcoding, livestream, gọi thoại/video** — cần FFmpeg + hạ tầng lưu trữ/CDN,
  chi phí vận hành vượt phạm vi đồ án.
- **Mã hóa đầu cuối** — hiện *không hề tuyên bố* có E2E; đây là lựa chọn có ý thức, tránh
  "tuyên bố bảo mật cao hơn năng lực thực tế".
- **Feed ranking bằng ML** — feed hiện thuần thời gian; đã có sẵn tín hiệu (quan hệ bạn bè,
  lịch sử tương tác) để làm ở giai đoạn sau.
- **ES/OpenSearch, push notification (FCM), MFA, quản lý thiết bị.**
- **Tuân thủ đầy đủ NĐ 13/2023 và NĐ 147/2024** — mới ở mức có thiết kế và tài liệu.
- **Kiểm thử tải/chaos/backup restore** — hiện chỉ có 11 test `contextLoads`.

---

## Hai điểm yếu kỹ thuật nên chủ động trình bày

Hội đồng nhiều khả năng sẽ hỏi. Trả lời trước sẽ thành điểm cộng:

1. **`CustomJwtDecoder` ở service downstream không verify chữ ký** — bảo mật phụ thuộc hoàn
   toàn vào việc mọi request đi qua gateway. Đúng với mô hình "trusted network", nhưng phải
   nói rõ là đánh đổi, và hướng khắc phục là verify chữ ký ở từng service hoặc dùng mTLS.
2. **12 microservice cho một MVP** — chính là "sai lầm số 3" trong bộ tiêu chí. Trình bày là
   lựa chọn có chủ đích để thể hiện năng lực kiến trúc, đồng thời thừa nhận modular monolith
   sẽ phù hợp hơn nếu tối ưu cho tốc độ ra sản phẩm.

---

## Thứ tự cắt giảm nếu hụt thời gian

```
Còn 5 ngày → P0 · P1 · P2 · P3 · P4
Còn 4 ngày → P0 · P1 · P2 · P4          (bỏ Story và ảnh chat)
Còn 3 ngày → P0 · P1 · P4               (bỏ luôn phần cài đặt/quyền riêng tư)
Còn 2 ngày → P0 · 4.4 seed · 4.5 tài liệu
```

**P0 không bao giờ được cắt** — đó là phần backend đã trả tiền xong mà chưa thu hoạch.
