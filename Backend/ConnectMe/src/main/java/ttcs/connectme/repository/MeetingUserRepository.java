package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.MeetingUserEntity;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingUserRepository extends JpaRepository<MeetingUserEntity, Long> {
    Optional<MeetingUserEntity> findByIdAndIsDeletedFalse(Long id);

    boolean existsByMeetingMeetingCodeAndUserIdAndIsDeletedFalse(String meetingCode, Long userId);

    Optional<MeetingUserEntity> findByMeetingMeetingCodeAndUserIdAndIsDeletedFalse(String meetingCode, Long userId);

    Optional<MeetingUserEntity> findByMeetingMeetingCodeAndUserId(String meetingCode, Long userId);

    List<MeetingUserEntity> getAllByMeetingMeetingCodeAndIsDeletedFalse(String meetingCode);

    List<MeetingUserEntity> getAllByMeetingMeetingCode(String meetingCode);
}
