package ttcs.connectme.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.request.PasswordUpdateRequest;
import ttcs.connectme.dto.request.UserUpdateRequest;
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
    private final PasswordEncoder passwordEncoder;

    public UserResponse getCurrentUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return userMapper.toResponse(user);
    }

    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String username = request.getUsername();
        String email = request.getEmail();

        if (username != null && !username.equals(user.getUsername()) && userRepository.existsByUsername(username))
            throw new AppException(ErrorCode.USERNAME_EXISTED);

        if (email != null && !email.equals(user.getEmail()) && userRepository.existsByEmail(email))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        userMapper.update(request, user);
        UserEntity updatedUser = userRepository.save(user);
        return userMapper.toResponse(updatedUser);
    }

    public void updatePassword(Long id, PasswordUpdateRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash()))
            throw new AppException(ErrorCode.INCORRECT_PASSWORD);

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
