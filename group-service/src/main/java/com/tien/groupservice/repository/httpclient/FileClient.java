package com.tien.groupservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.groupservice.configuration.FeignConfig;
import com.tien.sharedcontacts.media.ImageUploadEvent;
import com.tien.sharedcontacts.media.ImageUploadedEvent;

@FeignClient(name = "file-service", url = "${app.services.file.url}", configuration = FeignConfig.class)
public interface FileClient {
    @PostMapping("/images/upload")
    ImageUploadedEvent uploadImage(@RequestBody ImageUploadEvent event);
}
