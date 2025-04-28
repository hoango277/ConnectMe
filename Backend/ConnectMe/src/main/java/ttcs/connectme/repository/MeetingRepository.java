package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.MeetingEntity;

import java.util.Optional;

@Repository
public interface MeetingRepository extends JpaRepository<MeetingEntity, Long> {
    Optional<MeetingEntity> findByIdAndIsDeletedFalse (Long id);
}
