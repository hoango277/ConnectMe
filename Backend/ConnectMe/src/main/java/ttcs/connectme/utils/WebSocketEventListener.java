package ttcs.connectme.utils;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import ttcs.connectme.dto.webrtc.UserLeftEvent;
import ttcs.connectme.service.MeetingService;
import ttcs.connectme.service.MeetingUserService;

import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MeetingUserService meetingUserService;

    /**
     * Handle WebSocket disconnect events
     * This ensures that if a user disconnects unexpectedly, we clean up properly
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());

        // Get user session attributes
        Map<String, Object> attributes = headerAccessor.getSessionAttributes();
        if (attributes == null) return;

        String userId = (String) attributes.get("userId");
        String meetingId = (String) attributes.get("meetingId");

        if (userId != null && meetingId != null) {
            logger.info("User disconnected: {}", userId);

            // Remove user from meeting
            meetingUserService.deleteByMeetingIdAndUserId(meetingId,
                    Long.parseLong(userId));

            // Notify other participants
            messagingTemplate.convertAndSend(
                    "/topic/meeting." + meetingId + ".user.left",
                    new UserLeftEvent(userId, meetingId)
            );
        }
    }
}