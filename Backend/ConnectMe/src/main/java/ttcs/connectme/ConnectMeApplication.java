package ttcs.connectme;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ConnectMeApplication {

	public static void main(String[] args) {
		SpringApplication.run(ConnectMeApplication.class, args);
	}

}
