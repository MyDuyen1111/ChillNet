package com.tien.profileservice.repository.httpclient;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.tien.sharedcontacts.media.ImageUploadEvent;
import com.tien.sharedcontacts.media.ImageUploadedEvent;

// AuthenticationRequestInterceptor là @Component nên tự áp cho mọi Feign client,
// JWT của người gọi được forward sang file-service.
@FeignClient(name = "file-service", url = "${app.services.file.url}")
public interface FileClient {
    @PostMapping("/images/upload")
    ImageUploadedEvent uploadImage(@RequestBody ImageUploadEvent event);
}
