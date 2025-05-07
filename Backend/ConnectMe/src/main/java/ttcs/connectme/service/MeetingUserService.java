package ttcs.connectme.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import ttcs.connectme.dto.request.MeetingUserRequest;
import ttcs.connectme.dto.response.MeetingUserResponse;
import ttcs.connectme.dto.webrtc.MediaStateUpdate;
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
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MeetingUserService {
    MeetingUserRepository meetingUserRepository;
    MeetingUserMapper meetingUserMapper;
    MeetingRepository meetingRepository;
    UserRepository userRepository;

    public MeetingUserResponse addUser(MeetingUserRequest request, String meetingCode, Long userId) {
        // Kiểm tra dữ liệu đầu vào
        if (meetingCode == null || meetingCode.trim().isEmpty()) {
            throw new AppException(ErrorCode.MEETING_NOT_FOUND);
        }

        if (userId == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        // Tạo request mặc định nếu null
        if (request == null) {
            request = new MeetingUserRequest();
            request.setInvitationStatus(InvitationStatus.ACCEPTED);
        }

        // Kiểm tra người dùng đã trong cuộc họp chưa
        if (meetingUserRepository.existsByMeetingMeetingCodeAndUserIdAndIsDeletedFalse(meetingCode, userId)) {
            throw new AppException(ErrorCode.USER_ALREADY_IN_MEETING);
        }

        // Tìm cuộc họp
        MeetingEntity meeting = meetingRepository.findByMeetingCodeAndIsDeletedFalse(meetingCode)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_NOT_FOUND));

        // Tìm người dùng
        UserEntity user = userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            MeetingUserEntity meetingUser = meetingUserMapper.toEntity(request);
            meetingUser.setMeeting(meeting);
            meetingUser.setUser(user);
            meetingUser.setIsDeleted(false);
            meetingUser.setDeletedAt(null);
            if (meetingUser.getInvitationStatus() == null) {
                meetingUser.setInvitationStatus(InvitationStatus.PENDING);
            }

            MeetingUserEntity savedEntity = meetingUserRepository.save(meetingUser);
            return meetingUserMapper.toResponse(savedEntity);
        } catch (Exception e) {
            throw e;
        }
    }

    public MeetingUserResponse updateById(Long id, MeetingUserRequest request) {
        MeetingUserEntity meetingUser = meetingUserRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_USER_NOT_FOUND));
        meetingUserMapper.update(meetingUser, request);

        return meetingUserMapper.toResponse(meetingUserRepository.save(meetingUser));
    }

    public MeetingUserResponse updateByMeetingIdAndUserId(String meetingCode, Long userId, MeetingUserRequest request) {
        MeetingUserEntity meetingUser = meetingUserRepository
                .findByMeetingMeetingCodeAndUserIdAndIsDeletedFalse(meetingCode, userId)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_USER_NOT_FOUND));

        meetingUserMapper.update(meetingUser, request);
        if (meetingUser.getInvitationStatus().equals(InvitationStatus.ACCEPTED)) {
            meetingUser.setIsOnline(true);
            meetingUser.setIsMuted(false);
            meetingUser.setIsCameraOn(true);
            meetingUser.setIsScreenSharing(false);
            meetingUser.setIsSpeaking(false);
            meetingUser.setJoinTime(LocalDateTime.now());
            meetingUser.setLastHeartbeat(LocalDateTime.now());
        }

        return meetingUserMapper.toResponse(meetingUserRepository.save(meetingUser));
    }

    public void deleteByMeetingIdAndUserId(String meetingCode, Long userId) {
        MeetingUserEntity meetingUser = meetingUserRepository
                .findByMeetingMeetingCodeAndUserIdAndIsDeletedFalse(meetingCode, userId)
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_USER_NOT_FOUND));

        meetingUser.setIsDeleted(true);
        meetingUser.setDeletedAt(LocalDateTime.now());
        meetingUser.setDeletedBy(null);

        meetingUserRepository.save(meetingUser);
    }

    public List<MeetingUserResponse> getAllByMeetingId(String meetingCode) {
        return meetingUserRepository.getAllByMeetingMeetingCodeAndIsDeletedFalse(meetingCode)
                .stream().map(meetingUserMapper::toResponse).toList();
    }

    public void updateMeetingUserMediaState(MediaStateUpdate update)
    {
        MeetingUserEntity meetingUser = meetingUserRepository
                .findByMeetingMeetingCodeAndUserIdAndIsDeletedFalse(update.getMeetingCode(), update.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.MEETING_USER_NOT_FOUND));

        if(update.getMediaType().equals("video"))
        {
            meetingUser.setIsCameraOn(update.isEnabled());
        }
        else{
            meetingUser.setIsMuted(update.isEnabled());
        }
        meetingUserRepository.save(meetingUser);
    }

}
