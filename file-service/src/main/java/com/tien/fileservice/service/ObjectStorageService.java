package com.tien.fileservice.service;

import java.io.ByteArrayInputStream;
import java.util.UUID;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.tien.fileservice.exception.AppException;
import com.tien.fileservice.exception.ErrorCode;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Lớp duy nhất nói chuyện với MinIO. ImageService chỉ cần đưa bytes và nhận về
 * một URL public — không biết gì về S3/MinIO.
 */
// Không dùng `makeFinal = true` như các service khác: hai giá trị cấu hình dưới
// đây được Spring bơm qua @Value vào field, mà field final thì không bơm được.
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class ObjectStorageService {

    /** Object đã lưu: {@code key} để xoá/tra cứu sau này, {@code url} để nhúng thẳng vào thẻ img. */
    public record StoredObject(String key, String url) {}

    final MinioClient minioClient;

    @Value("${minio.bucket}")
    String bucket;

    @Value("${minio.public-url}")
    String publicUrl;

    /**
     * Bucket phải tồn tại và cho phép đọc ẩn danh, vì URL ảnh được lưu thẳng vào
     * MongoDB rồi trả về cho trình duyệt. Dùng presigned URL sẽ hết hạn sau vài
     * ngày và làm chết toàn bộ ảnh cũ.
     */
    @PostConstruct
    void ensureBucket() {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Đã tạo bucket MinIO '{}'", bucket);
            }
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                    .bucket(bucket)
                    .config(publicReadPolicy(bucket))
                    .build());
        } catch (Exception e) {
            // Không ném ra: file-service vẫn phải khởi động được khi chưa bật MinIO
            // (đúng tinh thần các service khác vẫn boot khi thiếu credential). Lúc
            // upload sẽ báo lỗi rõ ràng.
            log.error("Không chuẩn bị được bucket MinIO '{}': {}", bucket, e.getMessage(), e);
        }
    }

    /**
     * @param folder thư mục logic, ví dụ {@code posts/<ownerId>/<postId>}
     * @param extension phần mở rộng đã có sẵn dấu chấm, ví dụ {@code .png}
     */
    public StoredObject store(byte[] bytes, String contentType, String folder, String extension) {
        // Tên ngẫu nhiên: tránh hai người upload trùng tên đè lên nhau.
        String key = "%s/%s%s".formatted(folder, UUID.randomUUID(), extension);
        try (ByteArrayInputStream stream = new ByteArrayInputStream(bytes)) {
            minioClient.putObject(PutObjectArgs.builder().bucket(bucket).object(key).contentType(contentType).stream(
                            stream, bytes.length, -1)
                    .build());
        } catch (Exception e) {
            log.error("Upload lên MinIO thất bại (key={}): {}", key, e.getMessage(), e);
            throw new AppException(ErrorCode.STORAGE_UPLOAD_FAILED);
        }
        return new StoredObject(key, "%s/%s/%s".formatted(publicUrl, bucket, key));
    }

    private static String publicReadPolicy(String bucket) {
        return """
				{
				"Version": "2012-10-17",
				"Statement": [
					{
					"Effect": "Allow",
					"Principal": {"AWS": ["*"]},
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
					}
				]
				}"""
                .formatted(bucket);
    }
}
