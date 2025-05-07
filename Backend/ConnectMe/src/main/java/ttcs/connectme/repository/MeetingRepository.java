package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.MeetingEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingRepository extends JpaRepository<MeetingEntity, Long> {
    boolean existsByMeetingCodeAndIsDeletedFalse(String meetingCode);
    List<MeetingEntity> findByHostIdAndIsDeletedFalse(Long hostId);
    Optional<MeetingEntity> findByMeetingCodeAndIsDeletedFalse (String meetingCode);
    List<MeetingEntity> findByActualStartBetweenAndIsDeletedFalse (LocalDateTime start, LocalDateTime end);
}
