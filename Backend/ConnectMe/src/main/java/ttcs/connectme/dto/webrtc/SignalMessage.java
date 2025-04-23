package ttcs.connectme.dto.webrtc;

import lombok.Data;

@Data
public class SignalMessage {
    private String type;
    private String sender;
    private String recipient;
    private Object data;
}