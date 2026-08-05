# File Service

## 📖 Mô tả

Service upload file và media, lưu trữ trên MinIO (object storage tương thích S3).

## 🚀 Tính năng

- ✅ Upload 1 hoặc nhiều hình ảnh
- ✅ Phân loại: AVATAR, POST, BACKGROUND
- ✅ Tích hợp MinIO (bucket public-read, tự tạo lúc khởi động)


## 🔌 API chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/images/upload-form-data` | Upload 1 ảnh (form) |
| POST | `/images/upload-multiple-form-data` | Upload nhiều ảnh |
| POST | `/images/upload` | Upload ảnh (JSON) |

## 🔧 Cấu hình

- **Port**: 8085
- **Context Path**: `/file`
- **MinIO**: `minio.*` trong `application.yaml` (default khớp docker-compose.infra.yml)
- **Max file size**: 10MB

## 🚀 Chạy

```bash
cd file-service
mvn spring-boot:run
```

**Truy cập**: `http://localhost:8085/file/swagger-ui.html`
