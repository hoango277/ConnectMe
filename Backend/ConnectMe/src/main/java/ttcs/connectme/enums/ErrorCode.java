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
    UNCATEGORIZED_EXCEPTION("Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY("Key invalid", HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED("Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED("You do not have permission", HttpStatus.FORBIDDEN),
    MEETING_NOT_FOUND("Meeting not found", HttpStatus.NOT_FOUND),
    USER_NOT_FOUND("User not found", HttpStatus.NOT_FOUND),
    USER_ALREADY_IN_MEETING("User is already in the meeting", HttpStatus.BAD_REQUEST),
    MEETING_USER_NOT_FOUND("Cannot find user in this meeting", HttpStatus.NOT_FOUND),
    USERNAME_EXISTED("Username existed", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED("Email existed", HttpStatus.BAD_REQUEST),
    INVALID_CREDENTIALS("Invalid Credentials", HttpStatus.UNAUTHORIZED),
    INCORRECT_PASSWORD("Incorrect current password", HttpStatus.BAD_REQUEST),
    FILE_UPLOAD_ERROR("File upload error", HttpStatus.BAD_REQUEST),
    SEND_REMINDER_ERROR("Cannot send email reminder", HttpStatus.BAD_REQUEST);

    String message;
    HttpStatusCode statusCode;
}
