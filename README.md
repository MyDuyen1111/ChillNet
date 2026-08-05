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

Các service gọi nhau đồng bộ qua **OpenFeign**; cấu hình nằm tĩnh trong `application.yaml` của từng service.

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

### Yêu cầu

- Java 17+, Maven 3.6+ (hoặc dùng mvnw có sẵn trong từng service)
- Python 3.10+ (cho ai-service — build-all.sh tự tạo venv)
- Docker (cho MySQL + MongoDB)

### Chạy services

1. **Khởi động hạ tầng** (MySQL + MongoDB, đã cap RAM):

   ```bash
   docker compose -f docker-compose.infra.yml up -d
   ```
2. **Build toàn bộ** (shared libs + 10 service Java, và tự tạo venv cho ai-service Python):

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
├── shared-common/       # Shared utilities
└── shared-contacts/     # Shared media contracts
```

## 📜 License

Dự án được phát hành nhằm mục đích tham khảo, không dùng cho mục đích thương mại.
