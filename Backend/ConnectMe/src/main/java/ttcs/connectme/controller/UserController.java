package ttcs.connectme.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ttcs.connectme.dto.request.ForgotPasswordRequest;
import ttcs.connectme.dto.request.PasswordUpdateRequest;
import ttcs.connectme.dto.request.UserUpdateRequest;
import ttcs.connectme.dto.response.ApiResponse;
import ttcs.connectme.dto.response.UserResponse;
import ttcs.connectme.service.UserService;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {
    UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Authentication auth) {
        Long id = Long.parseLong(auth.getName());

        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .code(0)
                .message("Current user retrieved successfully")
                .result(userService.getCurrentUser(id))
                .build();

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @Valid @RequestBody UserUpdateRequest request,
            Authentication auth
    ) {
        Long id = Long.parseLong(auth.getName());

        ApiResponse<UserResponse> response = ApiResponse.<UserResponse>builder()
                .code(0)
                .message("User updated successfully")
                .result(userService.updateUser(id, request))
                .build();

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me/update-password")
    public ResponseEntity<Void> updatePassword(
            @Valid @RequestBody PasswordUpdateRequest request,
            Authentication auth
    ) {
        Long id = Long.parseLong(auth.getName());

        userService.updatePassword(id, request);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/forgot-password")
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        userService.forgotPassword(request);
    }
}
