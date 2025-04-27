package ttcs.connectme.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:3000")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Set prefix for endpoints the client will send messages to
        registry.setApplicationDestinationPrefixes("/app");

        // Enable simple broker for topic destinations
        // Messages with these prefixes will be routed to the message broker
        registry.enableSimpleBroker("/topic", "/user");

        // Set prefix for user-specific destinations
        registry.setUserDestinationPrefix("/user");
    }
}