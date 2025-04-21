package ttcs.connectme.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ttcs.connectme.dto.request.UserCreateRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.UserCreateResponse;
import ttcs.connectme.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {
    AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserCreateResponse>> register(@RequestBody UserCreateRequest request) {
        ApiResponse<UserCreateResponse> response = ApiResponse.<UserCreateResponse>builder()
                .code(0)
                .message("Register successfully")
                .result(authService.register(request))
                .build();

        return ResponseEntity.ok(response);
    }
}
