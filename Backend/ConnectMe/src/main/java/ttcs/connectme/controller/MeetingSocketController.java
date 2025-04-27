package ttcs.connectme.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import ttcs.connectme.dto.webrtc.*;
import ttcs.connectme.service.MeetingService;

@Controller
public class MeetingSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MeetingService meetingService;

    /**
     * Handle user joining a meeting
     */
    @MessageMapping("/meeting.join")
    public void joinMeeting(@Payload JoinMeetingRequest request) {
        // Process user joining the meeting
        meetingService.addParticipant(request.getMeetingId(), request.getUserId());

        // Broadcast to all participants that a new user joined
        messagingTemplate.convertAndSend(
                "/topic/meeting." + request.getMeetingId() + ".user.joined",
                new UserJoinedEvent(request.getUserId(), request.getMeetingId())
        );
    }

    /**
     * Handle user leaving a meeting
     */
    @MessageMapping("/meeting.leave")
    public void leaveMeeting(@Payload LeaveMeetingRequest request) {
        // Process user leaving the meeting
        meetingService.removeParticipant(request.getMeetingId(), request.getUserId());

        // Broadcast to all participants that a user left
        messagingTemplate.convertAndSend(
                "/topic/meeting." + request.getMeetingId() + ".user.left",
                new UserLeftEvent(request.getUserId(), request.getMeetingId())
        );
    }

    /**
     * Handle WebRTC signaling (offers, answers, ICE candidates)
     */
    @MessageMapping("/meeting.signal")
    public void signal(@Payload SignalRequest request) {
        // Forward the signal to the specific user
        messagingTemplate.convertAndSendToUser(
                request.getTargetUserId(),
                "/topic/meeting." + request.getMeetingId() + ".signal",
                request
        );
    }

    /**
     * Handle chat messages
     */
    @MessageMapping("/meeting.chat")
    public void sendChatMessage(@Payload ChatMessage message) {
        // Broadcast the chat message to all participants
        messagingTemplate.convertAndSend(
                "/topic/meeting." + message.getMeetingId() + ".chat",
                message
        );
    }

    /**
     * Handle file transfers
     */
    @MessageMapping("/meeting.file")
    public void sendFile(@Payload FileTransfer file) {
        // Broadcast the file to all participants
        messagingTemplate.convertAndSend(
                "/topic/meeting." + file.getMeetingId() + ".file",
                file
        );
    }

    /**
     * Handle audio/video state changes
     */
    @MessageMapping("/meeting.media.state")
    public void updateMediaState(@Payload MediaStateUpdate update) {
        // Broadcast the media state change to all participants
        messagingTemplate.convertAndSend(
                "/topic/meeting." + update.getMeetingId() + ".media.state",
                update
        );
    }
}