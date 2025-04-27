package ttcs.connectme.enums;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1000, "Key invalid", HttpStatus.BAD_REQUEST),
    USERNAME_EXISTED(1001, "Username existed", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED(1002, "Email existed", HttpStatus.BAD_REQUEST),
    INVALID_CREDENTIALS(1003, "Invalid Credentials", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1015, "You do not have permission", HttpStatus.FORBIDDEN);

    int code;
    String message;
    HttpStatusCode statusCode;
}
