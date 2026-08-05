package com.tien.fileservice.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.imageio.ImageIO;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.mongodb.lang.Nullable;
import com.tien.fileservice.dto.response.UploadResponse;
import com.tien.fileservice.entity.Image;
import com.tien.fileservice.entity.ImageVersions;
import com.tien.fileservice.exception.AppException;
import com.tien.fileservice.exception.ErrorCode;
import com.tien.fileservice.mapper.ImageMapper;
import com.tien.fileservice.repository.ImageRepository;
import com.tien.sharedcommon.converter.MediaConverter;
import com.tien.sharedcontacts.media.ImageUploadEvent;
import com.tien.sharedcontacts.media.ImageUploadedEvent;
import com.tien.sharedcontacts.media.MultipleImageResponse;
import com.tien.sharedcontacts.media.entity.ImageType;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/png", "image/webp", "image/gif", "image/avif");

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

    ObjectStorageService objectStorage;

    ImageRepository imageRepository;

    ImageMapper imageMapper;

    @Transactional
    public MultipleImageResponse uploadImages(ImageUploadEvent event) {
        // validate giống single
        if (event.files() == null || event.files().isEmpty()) {
            throw new AppException(ErrorCode.FILE_EMPTY);
        }
        if (StringUtils.isBlank(event.ownerId())) {
            throw new AppException(ErrorCode.OWNER_ID_REQUIRED);
        }
        if (event.imageType() == ImageType.POST_IMAGE && event.postId() == null) {
            throw new AppException(ErrorCode.POST_ID_REQUIRED);
        }

        List<ImageUploadedEvent> uploadedEvents = new ArrayList<>();

        try {
            for (int i = 0; i < event.files().size(); i++) {
                String base64 = event.files().get(i);

                Map<String, Object> props = null;
                if (event.propertiesMap() != null && i < event.propertiesMap().length) {
                    props = event.propertiesMap()[i];
                }

                ImageUploadedEvent uploadedEvent =
                        uploadImage(base64, event.imageType(), event.ownerId(), event.postId(), props);
                uploadedEvents.add(uploadedEvent);
            }
        } catch (AppException e) {
            log.error("Upload multiple images failed: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Upload multiple images failed", e);
            throw new AppException(ErrorCode.STORAGE_UPLOAD_FAILED);
        }

        return new MultipleImageResponse(uploadedEvents);
    }

    @Transactional
    public ImageUploadedEvent uploadImage(ImageUploadEvent event) throws IOException {
        if (event.files() == null || event.files().isEmpty()) {
            throw new AppException(ErrorCode.FILE_EMPTY);
        }
        if (StringUtils.isBlank(event.ownerId())) {
            throw new AppException(ErrorCode.OWNER_ID_REQUIRED);
        }
        if (event.imageType() == ImageType.POST_IMAGE && event.postId() == null) {
            throw new AppException(ErrorCode.POST_ID_REQUIRED);
        }

        String base64 = event.files().get(0);

        Map<String, Object> props = null;
        if (event.propertiesMap() != null && event.propertiesMap().length > 0) {
            props = event.propertiesMap()[0];
        }

        return uploadImage(base64, event.imageType(), event.ownerId(), event.postId(), props);
    }

    // upload single image json
    private ImageUploadedEvent uploadImage(
            String base64, ImageType imageType, String ownerId, String postId, Map<String, Object> properties)
            throws IOException {
        if (base64 == null || base64.isBlank()) {
            throw new AppException(ErrorCode.FILE_EMPTY);
        }
        // Decode Base64 to bytes
        byte[] bytes = MediaConverter.decodeFromBase64(base64);

        // Validate file size
        if (bytes.length > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }

        // Luồng base64 không kèm content-type, phải tự đoán từ magic bytes.
        String contentType = sniffContentType(bytes);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new AppException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }

        final String folder = buildFolder(imageType, ownerId, postId);
        var stored = objectStorage.store(bytes, contentType, folder, extensionOf(contentType));

        String format = formatOf(contentType);
        int[] size = probeDimensions(bytes);

        Image image = Image.builder()
                .ownerId(ownerId)
                .postId(postId)
                .contentType(contentType)
                .size((long) bytes.length)
                .imageType(imageType)
                .secureUrl(stored.url())
                .publicId(stored.key())
                .format(format)
                .width(size[0] > 0 ? size[0] : null)
                .height(size[1] > 0 ? size[1] : null)
                .imageVersions(generateImageVersions(stored.url()))
                .build();
        image = imageRepository.save(image);
        log.info("Saved image to MongoDB with id: {}", image.getId());

        Map<String, Object> safeProps = (properties == null) ? Map.of() : Map.copyOf(properties);

        // uploaded callback
        return new ImageUploadedEvent(stored.key(), stored.url(), safeProps);
    }

    // upload multiple image form data
    @Transactional
    public List<UploadResponse> uploadMultipleImages(
            List<MultipartFile> files, ImageType imageType, String ownerId, @Nullable String postId)
            throws IOException {
        List<UploadResponse> responses = new ArrayList<>();
        for (MultipartFile file : files) {
            responses.add(uploadImage(file, imageType, ownerId, postId));
        }
        return responses;
    }

    // upload single image form data
    @Transactional
    public UploadResponse uploadImage(MultipartFile file, ImageType imageType, String ownerId, @Nullable String postId)
            throws IOException {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.FILE_EMPTY);
        }
        if (StringUtils.isBlank(ownerId)) {
            throw new AppException(ErrorCode.OWNER_ID_REQUIRED);
        }
        if (imageType == ImageType.POST_IMAGE && postId == null) {
            throw new AppException(ErrorCode.POST_ID_REQUIRED);
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new AppException(ErrorCode.FILE_TYPE_NOT_ALLOWED);
        }
        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }

        final String folder = buildFolder(imageType, ownerId, postId);
        byte[] bytes = file.getBytes();
        String contentType = file.getContentType();

        var stored = objectStorage.store(bytes, contentType, folder, extensionOf(contentType));
        int[] size = probeDimensions(bytes);

        Image image = Image.builder()
                .ownerId(ownerId)
                .postId(postId)
                .contentType(contentType)
                .size(file.getSize())
                .imageType(imageType)
                .secureUrl(stored.url())
                .publicId(stored.key())
                .format(formatOf(contentType))
                .width(size[0] > 0 ? size[0] : null)
                .height(size[1] > 0 ? size[1] : null)
                .imageVersions(generateImageVersions(stored.url()))
                .build();
        image = imageRepository.save(image);

        return imageMapper.toUploadResponse(image);
    }

    /**
     * Cloudinary sinh sẵn ảnh thu nhỏ theo URL; MinIO là object storage thuần nên
     * không có. Cả 4 biến thể vì thế cùng trỏ về đúng một file gốc — giữ nguyên
     * cấu trúc {@link ImageVersions} để không phải sửa entity/DTO, và trên thực tế
     * không nơi nào đọc tới các biến thể này (frontend chỉ dùng secureUrl).
     */
    private ImageVersions generateImageVersions(String url) {
        return new ImageVersions(url, url, url, url);
    }

    /** Đoán content-type từ magic bytes cho luồng base64 (không có metadata đi kèm). */
    private String sniffContentType(byte[] b) {
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F') {
            return "image/gif";
        }
        // RIFF....WEBP
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E') {
            return "image/webp";
        }
        // ....ftypavif
        if (b.length >= 12 && b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p' && b[8] == 'a' && b[9] == 'v') {
            return "image/avif";
        }
        return "application/octet-stream";
    }

    private String formatOf(String contentType) {
        if (contentType == null) return null;
        int slash = contentType.indexOf('/');
        return slash < 0 ? contentType : contentType.substring(slash + 1);
    }

    private String extensionOf(String contentType) {
        String format = formatOf(contentType);
        return format == null ? "" : "." + format;
    }

    /**
     * Kích thước ảnh trước đây do Cloudinary trả về, giờ phải tự đọc. ImageIO không
     * giải mã được webp/avif nên trả về {@code {0, 0}} — chấp nhận được vì không
     * chỗ nào dựa vào width/height để hiển thị.
     */
    private int[] probeDimensions(byte[] bytes) {
        try (ByteArrayInputStream in = new ByteArrayInputStream(bytes)) {
            BufferedImage img = ImageIO.read(in);
            return img == null ? new int[] {0, 0} : new int[] {img.getWidth(), img.getHeight()};
        } catch (Exception e) {
            log.debug("Không đọc được kích thước ảnh: {}", e.getMessage());
            return new int[] {0, 0};
        }
    }

    private String buildFolder(ImageType imageType, String ownerId, String postId) {
        return switch (imageType) {
            case AVATAR -> "avatars/%s".formatted(ownerId);
            case POST_IMAGE -> "posts/%s/%s".formatted(ownerId, postId);
            case BACKGROUND_IMAGE -> "backgrounds/%s".formatted(ownerId);
            case GROUP_AVATAR -> "groups/%s/avatar".formatted(ownerId);
            case GROUP_COVER -> "groups/%s/cover".formatted(ownerId);
        };
    }
}
