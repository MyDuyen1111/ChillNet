package com.tien.interactionservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.tien.interactionservice.dto.response.LikeResponse;
import com.tien.interactionservice.entity.Like;

@Mapper(componentModel = "spring")
public interface LikeMapper {
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "userAvatar", ignore = true)
    LikeResponse toLikeResponse(Like like);
}
