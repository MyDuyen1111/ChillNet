package com.tien.notificationservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.tien.notificationservice.dto.response.NotificationResponse;
import com.tien.notificationservice.entity.Notification;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
    @Mapping(target = "id", source = "id")
    NotificationResponse toNotificationResponse(Notification notification);
}
