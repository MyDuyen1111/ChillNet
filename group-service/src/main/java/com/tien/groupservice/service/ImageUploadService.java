package com.tien.groupservice.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.tien.groupservice.repository.httpclient.FileClient;
import com.tien.sharedcommon.converter.MediaConverter;
import com.tien.sharedcontacts.media.ImageUploadEvent;
import com.tien.sharedcontacts.media.ImageUploadedEvent;
import com.tien.sharedcontacts.media.entity.ImageType;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Upload ảnh nhóm: gọi đồng bộ sang file-service qua Feign
 * (file-service là service duy nhất giữ credential Cloudinary).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ImageUploadService {

    FileClient fileClient;

    public ImageUploadedEvent uploadGroupAvatar(MultipartFile file, String groupId) throws Exception {
        return upload(file, ImageType.GROUP_AVATAR, groupId);
    }

    public ImageUploadedEvent uploadGroupCover(MultipartFile file, String groupId) throws Exception {
        return upload(file, ImageType.GROUP_COVER, groupId);
    }

    private ImageUploadedEvent upload(MultipartFile file, ImageType imageType, String groupId) throws Exception {
        // Convert file to base64
        String base64 = MediaConverter.convertToBase64(List.of(file)).get(0);

        ImageUploadEvent event = new ImageUploadEvent(List.of(base64), imageType, groupId, null, null);

        try {
            ImageUploadedEvent result = fileClient.uploadImage(event);
            log.info("Uploaded {} image for group {}", imageType, groupId);
            return result;
        } catch (Exception e) {
            log.error("Failed to upload image via file-service: {}", e.getMessage(), e);
            throw e;
        }
    }
}
