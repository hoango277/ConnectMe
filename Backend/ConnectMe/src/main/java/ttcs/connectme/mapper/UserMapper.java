package ttcs.connectme.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;
import ttcs.connectme.dto.request.UserCreateRequest;
import ttcs.connectme.dto.response.UserCreateResponse;
import ttcs.connectme.entity.UserEntity;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserMapper {
    @Mapping(target = "passwordHash", ignore = true)
    UserEntity toEntity(UserCreateRequest request);

    UserCreateResponse toResponse(UserEntity user);
}
