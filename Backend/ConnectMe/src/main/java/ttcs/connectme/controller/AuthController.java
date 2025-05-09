package ttcs.connectme.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import ttcs.connectme.dto.request.*;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.LoginResponse;
import ttcs.connectme.dto.response.RefreshResponse;
import ttcs.connectme.dto.response.UserResponse;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.repository.UserRepository;
import ttcs.connectme.service.AuthService;
import ttcs.connectme.service.SendEmailService;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {
    AuthService authService;
    SendEmailService sendEmailService;
    UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody UserCreateRequest request) {
        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .code(0)
                .message("Register successfully")
                .result(authService.register(request))
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/google-login")
    public void googleLogin(HttpServletResponse response) throws IOException {
        response.sendRedirect("/oauth2/authorization/google");
    }

    @GetMapping("/google-login-success")
    public void googleLoginSuccess(@AuthenticationPrincipal OAuth2User oAuth2User, HttpServletResponse response)
            throws Exception {
        LoginResponse loginResponse = authService.loginForOAuth(oAuth2User);

        Cookie cookie = new Cookie("jwt", loginResponse.getToken());
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(86400);

        response.addCookie(cookie);
        response.sendRedirect("http://localhost:3000?token=" + loginResponse.getToken());
    }

    @GetMapping("/validate-token")
    public ResponseEntity<ApiResponse<LoginResponse>> validateToken(HttpServletResponse httpServletResponse, @RequestHeader("Authorization") String authorizationHeader) {

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        String jwtToken = authorizationHeader.substring(7);
        try {
            Long userId = authService.extractUserIdFromToken(jwtToken);

            UserEntity user = userRepository.findByIdAndIsDeleted(userId, false)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            LoginResponse loginResponse = authService.validateToken(user.getUsername());

            Cookie cookie = new Cookie("jwt", loginResponse.getToken());
            cookie.setHttpOnly(true);
            cookie.setSecure(false);
            cookie.setPath("/");
            cookie.setMaxAge(86400);
            httpServletResponse.addCookie(cookie);

            ApiResponse<LoginResponse> response = ApiResponse.<LoginResponse>builder()
                    .code(0)
                    .message("Login successfully")
                    .result(loginResponse)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> authenticate(
            @RequestBody LoginRequest request,
            HttpServletResponse httpServletResponse) {
        LoginResponse loginResponse = authService.authenticate(request);

        Cookie cookie = new Cookie("jwt", loginResponse.getToken());
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(86400);
        httpServletResponse.addCookie(cookie);

        ApiResponse<LoginResponse> response = ApiResponse.<LoginResponse>builder()
                .code(0)
                .message("Login successfully")
                .result(loginResponse)
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletRequest httpServletRequest,
            HttpServletResponse httpServletResponse) throws Exception {
        String token = null;
        Cookie[] cookies = httpServletRequest.getCookies();

        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("jwt".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        Cookie cookie = new Cookie("jwt", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        httpServletResponse.addCookie(cookie);

        authService.logout(LogoutRequest.builder().token(token).build());

        return ApiResponse.<Void>builder()
                .message("Logout successfully")
                .build();
    }

    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(@RequestBody RefreshRequest request) throws Exception {
        return ApiResponse.<RefreshResponse>builder()
                .result(authService.refresh(request))
                .build();
    }

    @PostMapping("/sendOTP")
    public String sendOTP(@Valid @RequestBody SendOtpRequest request) {
        try {
            return sendEmailService.sendOTP(request.getEmail());
        } catch (Exception e) {
            log.error(String.valueOf(e));
            return "Error sending OTP";
        }
    }
}
