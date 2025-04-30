package ttcs.connectme.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.webrtc.*;
import ttcs.connectme.service.MeetingService;
import ttcs.connectme.service.MeetingUserService;

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
    public void joinMeeting(@Payload JoinMeetingRequest request, MeetingUserRequest meetingUserRequest) {
        // Process user joining the meeting
        meetingUserService.addUser(meetingUserRequest, request.getMeeingCode(), request.getUserId());

        // Broadcast to all participants that a new user joined
        messagingTemplate.convertAndSend(
                "/topic/meeting." + request.getMeeingCode() + ".user.joined",
                new UserJoinedEvent(request.getUserId(), request.getMeeingCode())
        );
    }

    /**
     * Handle user leaving a meeting
     */
    @MessageMapping("/meeting.leave")
    public void leaveMeeting(@Payload LeaveMeetingRequest request) {
        // Process user leaving the meeting
        meetingUserService.deleteByMeetingIdAndUserId(request.getMeetingCode(),
                request.getUserId());

        // Broadcast to all participants that a user left
        messagingTemplate.convertAndSend(
                "/topic/meeting." + request.getMeetingCode() + ".user.left",
                new UserLeftEvent(request.getUserId(), request.getMeetingCode())
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
                "/topic/meeting." + request.getMeetingCode() + ".signal",
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
                "/topic/meeting." + message.getMeetingCode() + ".chat",
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
                "/topic/meeting." + file.getMeetingCode() + ".file",
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
                "/topic/meeting." + update.getMeetingCode() + ".media.state",
                update
        );
    }
}