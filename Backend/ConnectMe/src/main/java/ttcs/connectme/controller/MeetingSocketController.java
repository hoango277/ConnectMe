package ttcs.connectme.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.webrtc.*;
import ttcs.connectme.service.MeetingService;
import ttcs.connectme.service.MeetingUserService;

import java.util.HashMap;
import java.util.Map;

@Controller
public class MeetingSocketController {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MeetingUserService meetingUserService;

    /**
     * Handle user joining a meeting
     */
    @MessageMapping("/meeting.join")
    public void joinMeeting(@Payload JoinMeetingRequest request) {
        Long userId = null;
        try {
            userId = request.getUserId();
            if (userId == null) {
                throw new IllegalArgumentException("userId cannot be null");
            }
        } catch (Exception e) {
            sendErrorToUser(request.getUserId() != null ? request.getUserId().toString() : "unknown",
                    request.getMeetingCode(),
                    "ERROR: userId format invalid - " + e.getMessage());
            return;
        }

        messagingTemplate.convertAndSend(
                "/topic/meeting." + request.getMeetingCode() + ".user.joined",
                new UserJoinedEvent(userId, request.getMeetingCode()));
    }

    /**
     * Handle user leaving a meeting
     */
    @MessageMapping("/meeting.leave")
    public void leaveMeeting(@Payload LeaveMeetingRequest request) {
        Long userId = null;
        try {
            userId = request.getUserId();
            if (userId == null) {
                throw new IllegalArgumentException("userId cannot be null");
            }
        } catch (Exception e) {
            return;
        }

        // Broadcast to all participants that a user left
        messagingTemplate.convertAndSend(
                "/topic/meeting." + request.getMeetingCode() + ".user.left",
                new UserLeftEvent(userId, request.getMeetingCode()));
    }

    /**
     * Handle WebRTC signaling (offers, answers, ICE candidates)
     */
    @MessageMapping("/meeting.signal")
    public void signal(@Payload SignalRequest request) {
        if (request.getTargetUserId() == null) {
            return;
        }
        try {
            messagingTemplate.convertAndSendToUser(
                    request.getTargetUserId(),
                    "/topic/meeting." + request.getMeetingCode() + ".signal",
                    request);
        } catch (Exception e) {
            sendErrorToUser(request.getFrom(),
                    request.getMeetingCode(),
                    "Error forwarding signal: " + e.getMessage());
        }
    }

    /**
     * Handle chat messages
     */
    @MessageMapping("/meeting.chat")
    public void sendChatMessage(@Payload ChatMessage message) {
        // Broadcast the chat message to all participants
        messagingTemplate.convertAndSend(
                "/topic/meeting." + message.getMeetingCode() + ".chat",
                message);
    }

    /**
     * Handle file transfers
     */
    @MessageMapping("/meeting.file")
    public void sendFile(@Payload FileTransfer file) {
        // Broadcast the file to all participants
        messagingTemplate.convertAndSend(
                "/topic/meeting." + file.getMeetingCode() + ".file",
                file);
    }

    /**
     * Handle audio/video state changes
     */
    @MessageMapping("/meeting.media.state")
    public void updateMediaState(@Payload MediaStateUpdate update) {
        // Broadcast the media state change to all participants
        messagingTemplate.convertAndSend(
                "/topic/meeting." + update.getMeetingCode() + ".media.state",
                update);
    }

    /**
     * Gửi thông báo lỗi đến người dùng cụ thể
     */
    private void sendErrorToUser(String userId, String meetingCode, String errorMessage) {
        Map<String, Object> errorPayload = new HashMap<>();
        errorPayload.put("type", "error");
        errorPayload.put("message", errorMessage);
        errorPayload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSendToUser(
                userId,
                "/topic/meeting." + meetingCode + ".error",
                errorPayload);
    }

    /**
     * Handle exceptions for all message mappings
     */
    @MessageExceptionHandler
    public void handleException(Exception exception) {
    }
}