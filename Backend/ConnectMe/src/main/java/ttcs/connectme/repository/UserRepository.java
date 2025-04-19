package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.MeetingUserEntity;
import ttcs.connectme.entity.UserEntity;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByIdAndIsDeletedFalse (Long id);
}
