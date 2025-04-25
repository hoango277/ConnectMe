package ttcs.connectme.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.UserResponse;
import ttcs.connectme.service.UserService;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {
    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Authentication auth) {
        Long id = Long.parseLong(auth.getName());

        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .code(0)
                .message("Get current user successfully")
                .result(userService.getCurrentUser(id))
                .build();

        return ResponseEntity.ok(response);
    }
}
