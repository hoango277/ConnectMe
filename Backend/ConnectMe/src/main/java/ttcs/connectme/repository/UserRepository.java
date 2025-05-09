package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.MeetingUserEntity;
import ttcs.connectme.entity.UserEntity;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByIdAndIsDeletedFalse (Long id);

    Optional<UserEntity> findByEmailAndIsDeletedFalse(String email);

    boolean existsByUsernameAndIsDeletedFalse(String username);

    boolean existsByEmailAndIsDeletedFalse(String email);

    Optional<UserEntity> findByUsernameAndIsDeleted(String username, boolean isDeleted);

    Optional<UserEntity> findByIdAndIsDeleted(Long id, boolean isDeleted);
}
