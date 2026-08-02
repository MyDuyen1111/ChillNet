package com.tien.groupservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.tien.groupservice.dto.response.GroupResponse;
import com.tien.groupservice.entity.Group;

@Mapper(componentModel = "spring")
public interface GroupMapper {
    @Mapping(target = "ownerName", ignore = true)
    @Mapping(target = "ownerAvatar", ignore = true)
    @Mapping(target = "memberCount", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    @Mapping(target = "modifiedDate", ignore = true)
    @Mapping(target = "isMember", ignore = true)
    @Mapping(target = "memberRole", ignore = true)
    GroupResponse toGroupResponse(Group group);
}
