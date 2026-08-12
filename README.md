# ChillNet - Social Network (Microservice Architecture)

## 📖 Giới thiệu

**ChillNet** là nền tảng mạng xã hội được xây dựng với kiến trúc **Microservice**, tập trung vào việc phát triển hệ thống phân tán có khả năng mở rộng.

## 🏗️ Kiến trúc hệ thống

| Service                        | Port | Mô tả                                  |
| ------------------------------ | ---- | ---------------------------------------- |
| **API Gateway**          | 8080 | Điểm vào chính cho tất cả requests |
| **Identity Service**     | 8081 | Đăng ký, đăng nhập, xác thực JWT |
| **Profile Service**      | 8082 | Quản lý profile người dùng          |
| **Notification Service** | 8083 | Thông báo in-app và email (Brevo)     |
| **Post Service**         | 8084 | Quản lý bài đăng, lưu, chia sẻ    |
| **File Service**         | 8085 | Upload file và media (MinIO)            |
| **Chat Service**         | 8086 | Chat real-time với WebSocket            |
| **Social Service**       | 8087 | Kết bạn, follow, block                 |
| **Interaction Service**  | 8088 | Comment và like                         |
| **Group Service**        | 8089 | Quản lý nhóm, thành viên, quyền    |
| **AI Service**           | 8090 | Kiểm duyệt nội dung bằng LLM (Python/FastAPI, OpenAI-compatible) |
| **Moderation Service**   | 8091 | Báo cáo nội dung, hàng đợi kiểm duyệt, khiếu nại, nhật ký kiểm toán |

Các service gọi nhau đồng bộ qua **OpenFeign**; cấu hình nằm tĩnh trong `application.yaml` của từng service.

### Luồng kiểm duyệt nội dung

Hệ thống có hai lớp kiểm duyệt tách biệt:

- **Trước khi đăng** — `ai-service` chấm điểm bài viết/bình luận bằng LLM. Fail-open: AI lỗi hoặc chưa cấu hình khóa thì vẫn cho đăng, chỉ chặn khi mức độ là `HIGH`.
- **Sau khi đăng** — `moderation-service` xử lý báo cáo của người dùng theo quy trình có thể kiểm toán:

  ```text
  Người dùng báo cáo  →  gộp vào hồ sơ (ModerationCase) theo đối tượng
                      →  kiểm duyệt viên nhận xử lý
                      →  ra quyết định + thực thi (ẩn/giảm phân phối/gỡ/khóa tài khoản)
                      →  thông báo cho chủ nội dung và người báo cáo
                      →  người bị xử lý khiếu nại
                      →  giữ nguyên hoặc đảo ngược và khôi phục
  ```

  Mọi bước đều ghi vào `AuditLog` (chỉ ghi thêm, không sửa/xóa). Nội dung bị gỡ **không bị xóa khỏi cơ sở dữ liệu** mà chỉ đổi `moderationStatus`, để còn khôi phục được khi khiếu nại đúng. Phần quản trị yêu cầu `ROLE_ADMIN`.

  Tài khoản bị khóa mất quyền ngay lập tức (gateway kiểm tra trạng thái ở mỗi lần introspect chứ không đợi token hết hạn) — nhưng cũng vì thế họ không tự gửi khiếu nại được, nên quản trị viên có thêm `POST /cases/{id}/revert` để gỡ biện pháp trực tiếp.

## 🛠️ Tech Stack

- **Backend**: Java 17, Spring Boot 3.5.5, Spring Cloud (Gateway, OpenFeign)
- **AI Service**: Python 3, FastAPI + uvicorn (service polyglot riêng)
- **Database**: MySQL, MongoDB
- **Authentication**: JWT, OAuth2
- **APIs**: Swagger (Springdoc OpenAPI)
- **Storage**: MinIO (object storage, S3-compatible)
- **Email**: Brevo
- **AI**: LLM tương thích OpenAI (kiểm duyệt nội dung, cấu hình qua `OPENAI_BASE_URL`)

## 🚀 Cài đặt

### Chạy nhanh toàn bộ trên máy dev

Sau khi có một trong hai môi trường hạ tầng bên dưới, dùng một lệnh:

- Docker + Docker Compose (khuyến nghị; script tự khởi động MySQL, MongoDB và MinIO), hoặc
- bộ binary local đã được cấp trong `.runtime/` cùng dữ liệu trong `.runtime-data/`.

```bash
scripts/start-all.sh
```

Script tự kiểm tra artifact, cài frontend dependency khi cần, chọn Docker Compose khi không có
đủ binary trong `.runtime/`, rồi khởi động MySQL, MongoDB, MinIO, toàn bộ backend/AI và frontend.
Sau khi pull hoặc đổi code backend, dừng stack và ép build lại bằng:

```bash
scripts/stop-all.sh
scripts/start-all.sh --build
```

Dừng toàn bộ bằng `scripts/stop-all.sh`.

### Yêu cầu

- Java 17+, Maven 3.6+ (hoặc dùng mvnw có sẵn trong từng service)
- Python 3.10+ (cho ai-service — build-all.sh tự tạo venv)
- Docker (cho MySQL + MongoDB)

### Chạy services

1. **Khởi động hạ tầng** (MySQL + MongoDB, đã cap RAM):

   ```bash
   docker compose -f docker-compose.infra.yml up -d
   ```
2. **Build toàn bộ** (shared libs + 11 service Java, và tự tạo venv cho ai-service Python):

   ```bash
   scripts/build-all.sh
   ```
3. **Chạy toàn bộ stack** (heap đã cap, tổng ~3GB):

   ```bash
   export JWT_SIGNER_KEY=<chuỗi bí mật HS512>   # bắt buộc
   scripts/run-all.sh
   # dừng: scripts/stop-all.sh
   ```

   Env tùy chọn (thiếu thì service vẫn chạy, chỉ tính năng tương ứng không hoạt động):
   `CLIENT_ID`/`CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` (Google login), `CLOUD_NAME`/`API_KEY`/`API_SECRET` (upload ảnh), `BREVO_APIKEY` (email), `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL` (kiểm duyệt AI — thiếu key thì bỏ qua kiểm duyệt, cho đăng bình thường).
4. **Truy cập**:

   - API Gateway: `http://localhost:8080`
   - Swagger UI: `http://localhost:8080/swagger-ui.html`

## 📌 Tính năng chính

- ✅ Đăng ký/đăng nhập với JWT, xác thực email OTP
- ✅ Quản lý profile, avatar, background
- ✅ Đăng bài với hình ảnh, privacy settings
- ✅ Comment, like, share bài đăng
- ✅ Kết bạn, follow, block
- ✅ Chat real-time (1-1 và group)
- ✅ Quản lý nhóm với quyền hạn
- ✅ Thông báo in-app và qua email
- ✅ Kiểm duyệt nội dung tự động bằng AI (chặn bài/bình luận vi phạm khi đăng)
- ✅ Báo cáo bài viết, bình luận, tài khoản và nhóm
- ✅ Hàng đợi kiểm duyệt cho quản trị viên: nhận xử lý, ẩn/giảm phân phối/gỡ nội dung, khóa tài khoản có thời hạn hoặc vĩnh viễn
- ✅ Khiếu nại quyết định kiểm duyệt và khôi phục khi khiếu nại đúng
- ✅ Nhật ký kiểm toán cho mọi thao tác kiểm duyệt
- ⬜ Giao diện web cho báo cáo/kiểm duyệt (hiện mới có API)

## 📂 Cấu trúc dự án

```
chillnet/
├── api-gateway/          # API Gateway
├── identity-service/     # Authentication
├── profile-service/      # User profiles
├── notification-service/ # Notifications
├── post-service/         # Posts
├── file-service/         # File uploads
├── chat-service/         # Real-time chat
├── social-service/       # Friendships
├── interaction-service/ # Comments & likes
├── group-service/        # Groups
├── ai-service/           # AI content moderation (Python/FastAPI, OpenAI-compatible)
├── moderation-service/   # Báo cáo, kiểm duyệt thủ công, khiếu nại, audit log
├── shared-common/       # Shared utilities
└── shared-contacts/     # Shared media contracts
```

## 📜 License

Dự án được phát hành nhằm mục đích tham khảo, không dùng cho mục đích thương mại.
