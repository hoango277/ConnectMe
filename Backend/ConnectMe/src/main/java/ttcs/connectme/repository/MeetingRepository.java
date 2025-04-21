package ttcs.connectme.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ttcs.connectme.entity.MeetingEntity;

import java.util.Optional;

public interface MeetingRepository extends JpaRepository<MeetingEntity, Long> {
    Optional<MeetingEntity> findByMeetingCode(String meetingCode);
    boolean existsByMeetingCode(String meetingCode);
    Page<MeetingEntity> findByHostId(Long hostId, Pageable pageable);
}
