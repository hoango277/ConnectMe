package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ttcs.connectme.entity.UserEntity;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<UserEntity> findByUsernameAndIsDeleted(String username, boolean isDeleted);

    Optional<UserEntity> findByIdAndIsDeleted(Long id, boolean isDeleted);
}
