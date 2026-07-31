package com.tien.profileservice.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.tien.profileservice.repository.httpclient.FileClient;
import com.tien.sharedcommon.converter.MediaConverter;
import com.tien.sharedcontacts.media.ImageUploadEvent;
import com.tien.sharedcontacts.media.ImageUploadedEvent;
import com.tien.sharedcontacts.media.entity.ImageType;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Upload avatar/background: gọi đồng bộ sang file-service qua Feign
 * (file-service là service duy nhất giữ credential Cloudinary).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImageUploadService {

    FileClient fileClient;

    public ImageUploadedEvent uploadAvatar(MultipartFile file, String ownerId) throws Exception {
        return upload(file, ImageType.AVATAR, ownerId);
    }

    public ImageUploadedEvent uploadBackgroundImage(MultipartFile file, String ownerId) throws Exception {
        return upload(file, ImageType.BACKGROUND_IMAGE, ownerId);
    }

    private ImageUploadedEvent upload(MultipartFile file, ImageType imageType, String ownerId) throws Exception {
        // Convert file to base64
        String base64 = MediaConverter.convertToBase64(List.of(file)).get(0);

        ImageUploadEvent event = new ImageUploadEvent(List.of(base64), imageType, ownerId, null, null);

        try {
            ImageUploadedEvent result = fileClient.uploadImage(event);
            log.info("Uploaded {} image for owner {}", imageType, ownerId);
            return result;
        } catch (Exception e) {
            log.error("Failed to upload image via file-service: {}", e.getMessage(), e);
            throw e;
        }
    }
}
