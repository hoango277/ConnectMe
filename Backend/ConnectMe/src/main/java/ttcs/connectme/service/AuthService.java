package ttcs.connectme.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.request.UserCreateRequest;
import ttcs.connectme.dto.response.UserCreateResponse;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.repository.UserRepository;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserCreateResponse register(UserCreateRequest request) {
        if (userRepository.existsByUsername(request.getUsername()))
            throw new AppException(ErrorCode.USERNAME_EXISTED);

        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        if (request.getAvatar() != null && !request.getAvatar().isEmpty())
            user.setAvatar(request.getAvatar());

        UserEntity userCreate = userRepository.save(user);

        return UserCreateResponse.builder()
                .id(userCreate.getId())
                .username(userCreate.getUsername())
                .email(userCreate.getEmail())
                .fullName(userCreate.getFullName())
                .avatar(userCreate.getAvatar())
                .isActive(userCreate.getIsActive())
                .build();
    }
}
