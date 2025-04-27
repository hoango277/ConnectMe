package ttcs.connectme.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ttcs.connectme.entity.UserEntity;

<<<<<<< HEAD
@Repository
=======
import java.util.Optional;

>>>>>>> e79d9d2c2063d3b2464901f13f5bae267bb34c33
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    Optional<UserEntity> findByUsername(String username);
}
