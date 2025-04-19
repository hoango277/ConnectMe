package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.MeetingUserEntity;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingUserRepository extends JpaRepository<MeetingUserEntity, Long> {
    Optional<MeetingUserEntity> findByIdAndIsDeletedFalse (Long id);
    boolean existsByMeetingIdAndUserIdAndIsDeletedFalse (Long meetingId, Long userId);
    Optional<MeetingUserEntity> findByMeetingIdAndUserIdAndIsDeletedFalse (Long meetingId, Long userId);
    List<MeetingUserEntity> getAllByMeetingIdAndIsDeletedFalse (Long meetingId);
}
