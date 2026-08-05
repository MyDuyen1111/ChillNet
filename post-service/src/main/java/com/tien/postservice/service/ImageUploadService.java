package com.tien.postservice.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.tien.postservice.repository.httpclient.FileClient;
import com.tien.sharedcommon.converter.MediaConverter;
import com.tien.sharedcontacts.media.ImageUploadEvent;
import com.tien.sharedcontacts.media.ImageUploadedEvent;
import com.tien.sharedcontacts.media.entity.ImageType;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Upload ảnh bài đăng: gọi đồng bộ sang file-service qua Feign
 * (file-service là service duy nhất nói chuyện với object storage).
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ImageUploadService {
    FileClient fileClient;

    public List<String> uploadPostImages(List<MultipartFile> files, String ownerId, String postId) throws Exception {
        if (files == null || files.isEmpty()) {
            return List.of();
        }
        List<String> imageUrls = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                ImageUploadedEvent result = uploadSingleImage(file, ownerId, postId);
                if (result != null && result.imageUrl() != null) {
                    imageUrls.add(result.imageUrl());
                }
            }
        }
        return imageUrls;
    }

    private ImageUploadedEvent uploadSingleImage(MultipartFile file, String ownerId, String postId) throws Exception {
        String base64 = MediaConverter.convertToBase64(List.of(file)).get(0);

        ImageUploadEvent event = new ImageUploadEvent(List.of(base64), ImageType.POST_IMAGE, ownerId, postId, null);

        try {
            return fileClient.uploadImage(event);
        } catch (Exception e) {
            log.error("Failed to upload post image via file-service: {}", e.getMessage(), e);
            throw e;
        }
    }
}
