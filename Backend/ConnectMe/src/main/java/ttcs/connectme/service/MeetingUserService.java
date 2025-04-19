package ttcs.connectme.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.response.MeetingUserResponse;
import ttcs.connectme.entity.MeetingEntity;
import ttcs.connectme.entity.MeetingUserEntity;
import ttcs.connectme.entity.UserEntity;
import ttcs.connectme.enums.ErrorCode;
import ttcs.connectme.enums.InvitationStatus;
import ttcs.connectme.exception.AppException;
import ttcs.connectme.mapper.MeetingUserMapper;
import ttcs.connectme.repository.MeetingRepository;
import ttcs.connectme.repository.MeetingUserRepository;
import ttcs.connectme.repository.UserRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingUserService {
    MeetingUserRepository meetingUserRepository;
    MeetingUserMapper meetingUserMapper;
    MeetingRepository meetingRepository;
    UserRepository userRepository;

    public MeetingUserResponse addUser (MeetingUserRequest request, Long meetingId, Long userId) {
        if (meetingUserRepository.existsByMeetingIdAndUserIdAndIsDeletedFalse(meetingId, userId)) {
            throw new AppException(ErrorCode.USER_ALREADY_IN_MEETING);
        }
        MeetingEntity meeting = meetingRepository.findByIdAndIsDeletedFalse(meetingId)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_NOT_FOUND));
        UserEntity user = userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        MeetingUserEntity meetingUser = meetingUserMapper.toEntity(request);
        meetingUser.setMeeting(meeting);
        meetingUser.setUser(user);
        meetingUser.setInvitationStatus(InvitationStatus.PENDING);
        meetingUser.setIsOnline(true);
        meetingUser.setIsMuted(false);
        meetingUser.setIsCameraOn(true);
        meetingUser.setIsScreenSharing(false);
        meetingUser.setIsSpeaking(false);
        meetingUser.setLastHeartbeat(LocalDateTime.now());

        return meetingUserMapper.toResponse(meetingUserRepository.save(meetingUser));
    }

    public MeetingUserResponse updateById (Long id, MeetingUserRequest request) {
        MeetingUserEntity meetingUser = meetingUserRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_USER_NOT_FOUND));
        meetingUserMapper.update(meetingUser, request);

        return meetingUserMapper.toResponse(meetingUserRepository.save(meetingUser));
    }
}
