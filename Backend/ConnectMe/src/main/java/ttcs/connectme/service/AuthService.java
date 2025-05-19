package ttcs.connectme.service;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import lombok.RequiredArgsConstructor;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.request.LoginRequest;
import ttcs.connectme.dto.request.LogoutRequest;
import ttcs.connectme.dto.request.RefreshRequest;
import ttcs.connectme.dto.request.UserCreateRequest;
import ttcs.connectme.dto.response.LoginResponse;
import ttcs.connectme.dto.response.RefreshResponse;
import ttcs.connectme.dto.response.UserResponse;
import ttcs.connectme.entity.InvalidatedTokenEntity;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.mapper.UserMapper;
import ttcs.connectme.repository.InvalidatedTokenRepository;
import ttcs.connectme.repository.UserRepository;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final InvalidatedTokenRepository invalidatedTokenRepository;

    @NonFinal
    @Value("${signer_key}")
    private String signerKey;

    public UserResponse register(UserCreateRequest request) {
        if (userRepository.existsByUsernameAndIsDeletedFalse(request.getUsername()))
            throw new AppException(ErrorCode.USERNAME_EXISTED);

        if (userRepository.existsByEmailAndIsDeletedFalse(request.getEmail()))
            throw new AppException(ErrorCode.EMAIL_EXISTED);

        UserEntity user = userMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        UserEntity userCreate = userRepository.save(user);
        return userMapper.toResponse(userCreate);
    }

    public LoginResponse validateToken(String userName) {
        UserEntity user = userRepository.findByUsernameAndIsDeleted(userName, false)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

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

    public LoginResponse authenticate(LoginRequest request) {
        UserEntity user = userRepository.findByUsernameAndIsDeleted(request.getUsername(), false)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash()))
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

    public LoginResponse loginForOAuth(OAuth2User oAuth2User) throws Exception {

        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = attributes.getOrDefault("email", "").toString();
        String name = attributes.getOrDefault("name", "").toString();

        String username = email.split("@")[0];

        Optional<UserEntity> userOptional = userRepository.findByEmailAndIsDeletedFalse(email);
        UserEntity user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
        } else {
            user = UserEntity.builder()
                    .email(email)
                    .fullName(name)
                    .username(username)
                    .passwordHash("")
                    .isActive(true)
                    .build();
            user = userRepository.save(user);
        }

        System.out.println(user.toString());
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

    public void logout(LogoutRequest request) throws Exception {
        SignedJWT signedJWT = verifyToken(request.getToken());
        String id = signedJWT.getJWTClaimsSet().getJWTID();
        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();
        invalidatedTokenRepository.save(InvalidatedTokenEntity.builder()
                .id(id)
                .expiryTime(expiryTime)
                .build());
    }

    public RefreshResponse refresh(RefreshRequest request) throws Exception {
        SignedJWT signedJWT = SignedJWT.parse(request.getToken());
        String id = signedJWT.getJWTClaimsSet().getJWTID();
        Date expiryTime = signedJWT.getJWTClaimsSet().getExpirationTime();
        Long userId = Long.parseLong(signedJWT.getJWTClaimsSet().getSubject());

        UserEntity user = userRepository.findByIdAndIsDeleted(userId, false)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        invalidatedTokenRepository.save(InvalidatedTokenEntity.builder()
                .id(id)
                .expiryTime(expiryTime)
                .build());

        return RefreshResponse.builder()
                .token(generateToken(user))
                .build();
    }

    private String generateToken(UserEntity user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .subject(Long.toString(user.getId()))
                .issuer("ConnectMe")
                .issueTime(new Date())
                .expirationTime(new Date(
                        Instant.now().plus(1, ChronoUnit.HOURS).toEpochMilli()))
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

    private SignedJWT verifyToken(String token) throws Exception {
        JWSVerifier verifier = new MACVerifier(signerKey);
        SignedJWT signedJWT = SignedJWT.parse(token);
        Date expiration = signedJWT.getJWTClaimsSet().getExpirationTime();
        boolean verified = signedJWT.verify(verifier);

        if (!(verified && expiration.after(new Date())))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        if (invalidatedTokenRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        return signedJWT;
    }

    public Long extractUserIdFromToken(String token) {
        try {
            JWSVerifier verifier = new MACVerifier(signerKey);
            SignedJWT signedJWT = SignedJWT.parse(token);

            if (!signedJWT.verify(verifier)) {
                throw new RuntimeException("Token signature verification failed");
            }

            String userIdStr = signedJWT.getJWTClaimsSet().getSubject();
            return Long.parseLong(userIdStr);
        } catch (Exception e) {
            throw new RuntimeException("Error extracting user ID from token", e);
        }
    }

}