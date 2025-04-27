package ttcs.connectme.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSObject;
import com.nimbusds.jose.Payload;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import lombok.RequiredArgsConstructor;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.request.LoginRequest;
import ttcs.connectme.dto.request.UserCreateRequest;
import ttcs.connectme.dto.response.LoginResponse;
import ttcs.connectme.dto.response.UserCreateResponse;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.mapper.UserMapper;
import ttcs.connectme.repository.UserRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @NonFinal
    @Value("${SIGNER_KEY}")
    String signerKey;

    public UserCreateResponse register(UserCreateRequest request) {
        if (userRepository.existsByUsername(request.getUsername()))
            throw new AppException(ErrorCode.USERNAME_EXISTED);

        if (userRepository.existsByEmail(request.getEmail()))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        UserEntity user = userMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        if (request.getAvatar() != null && !request.getAvatar().isEmpty())
            user.setAvatar(request.getAvatar());

        UserEntity userCreate = userRepository.save(user);
        return userMapper.toResponse(userCreate);
    }

    public LoginResponse authenticate(LoginRequest request) {
        UserEntity user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
        if (!authenticated)
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        
        String token = generateToken(user);
        LoginResponse.UserInfo userInfo = new LoginResponse.UserInfo();
        userInfo.setId(user.getId());
        userInfo.setName(user.getFullName());
        userInfo.setEmail(user.getEmail());
        return LoginResponse.builder()
                .token(token)
                .user(userInfo)
                .build();
    }

    private String generateToken(UserEntity user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .subject(Long.toString(user.getId()))
                .issuer("ConnectMe")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(1, ChronoUnit.HOURS).toEpochMilli()
                ))
                .jwtID(UUID.randomUUID().toString())
                .build();

        Payload payload = new Payload(claimsSet.toJSONObject());
        JWSObject object = new JWSObject(header, payload);

        try {
            object.sign(new MACSigner(signerKey.getBytes()));
            return object.serialize();
        } catch (Exception e) {
            log.error("Cannot create token", e);
            throw new RuntimeException(e);
        }
    }
}
