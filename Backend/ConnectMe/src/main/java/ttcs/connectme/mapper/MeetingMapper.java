package ttcs.connectme.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

import ttcs.connectme.dto.request.MeetingRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.MeetingResponse;
import ttcs.connectme.entity.MeetingEntity;

@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface MeetingMapper {

    MeetingResponse toResponse(MeetingEntity entity);

    @Mapping(target = "host", ignore = true)
    @Mapping(target = "meetingCode", ignore = true)
    @Mapping(target = "actualStart", ignore = true)
    @Mapping(target = "actualEnd", ignore = true)
    @Mapping(target = "meetingStatus", constant = "SCHEDULED")
    @Mapping(target = "currentParticipants", constant = "0")
    @Mapping(target = "totalParticipants", constant = "0")
    @Mapping(target = "chatMessageCount", constant = "0")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    MeetingEntity toEntity(MeetingRequest request);
}
