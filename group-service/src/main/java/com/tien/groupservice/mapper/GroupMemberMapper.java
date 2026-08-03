package com.tien.groupservice.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.tien.groupservice.dto.response.GroupMemberResponse;
import com.tien.groupservice.entity.GroupMember;

@Mapper(componentModel = "spring")
public interface GroupMemberMapper {
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "avatar", ignore = true)
    @Mapping(target = "joinedDate", ignore = true)
    GroupMemberResponse toGroupMemberResponse(GroupMember groupMember);
}
