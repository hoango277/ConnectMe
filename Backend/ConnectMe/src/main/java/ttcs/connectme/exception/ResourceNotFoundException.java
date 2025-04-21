package ttcs.connectme.exception;

import lombok.Getter;
import ttcs.connectme.enums.ErrorCode;

@Getter
public class ResourceNotFoundException extends AppException {
    private final String resourceName;
    private final String fieldName;
    private final Object fieldValue;

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(ErrorCode.RESOURCE_NOT_FOUND);
        this.resourceName = resourceName;
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
    }

    @Override
    public String getMessage() {
        return String.format("%s not found with %s: '%s'",
                resourceName, fieldName, fieldValue);
    }
}
