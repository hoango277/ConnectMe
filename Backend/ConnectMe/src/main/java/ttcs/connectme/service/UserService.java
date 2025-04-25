package ttcs.connectme.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.response.UserResponse;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.mapper.UserMapper;
import ttcs.connectme.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserMapper userMapper;
    private final UserRepository userRepository;

    public UserResponse getCurrentUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        return userMapper.toResponse(user);
    }
}
