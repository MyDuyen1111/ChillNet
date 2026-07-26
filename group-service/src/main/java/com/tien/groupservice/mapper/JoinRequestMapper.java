package com.tien.groupservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.tien.groupservice.dto.response.JoinRequestResponse;
import com.tien.groupservice.entity.JoinRequest;

@Mapper(componentModel = "spring")
public interface JoinRequestMapper {
    @Mapping(target = "groupName", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "avatar", ignore = true)
    @Mapping(target = "requestedDate", ignore = true)
    @Mapping(target = "reviewedDate", ignore = true)
    JoinRequestResponse toJoinRequestResponse(JoinRequest joinRequest);
}
