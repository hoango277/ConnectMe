package ttcs.connectme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
<<<<<<< HEAD

@SpringBootApplication
=======
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
>>>>>>> origin/DuyAnh-dev
public class ConnectMeApplication {

	public static void main(String[] args) {
		SpringApplication.run(ConnectMeApplication.class, args);
	}

}
