package ttcs.connectme.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ttcs.connectme.dto.request.LoginRequest;
import ttcs.connectme.dto.request.UserCreateRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.LoginResponse;
import ttcs.connectme.dto.response.UserResponse;
import ttcs.connectme.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {
    AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody UserCreateRequest request) {
        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .code(0)
                .message("Register successfully")
                .result(authService.register(request))
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> authenticate(
            @RequestBody LoginRequest request,
            HttpServletResponse httpServletResponse
    ) {
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
}
