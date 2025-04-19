package ttcs.connectme.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.response.MeetingUserResponse;
import ttcs.connectme.entity.MeetingUserEntity;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)public interface MeetingUserMapper {
    MeetingUserEntity toEntity (MeetingUserRequest request);
    MeetingUserResponse toResponse (MeetingUserEntity entity);
    void update (@MappingTarget MeetingUserEntity entity, MeetingUserRequest request);
}
