package ttcs.connectme.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import ttcs.connectme.dto.webrtc.SignalMessage;

@Controller
public class SignalingController {

    @MessageMapping("/signal")
    @SendTo("/topic/public")
    public SignalMessage sendSignal(@Payload SignalMessage message,
                                    SimpMessageHeaderAccessor headerAccessor) {
        // Store user session if needed
        if ("join".equals(message.getType())) {
            headerAccessor.getSessionAttributes().put("username", message.getSender());
        }
        return message;
    }
}