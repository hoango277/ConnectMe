package ttcs.connectme.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:3000", "https://hoangotech.id.vn")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Set prefix for endpoints the client will send messages to
        registry.setApplicationDestinationPrefixes("/app");

        // Enable simple broker for topic destinations
        // Messages with these prefixes will be routed to the message broker
        registry.enableSimpleBroker("/topic", "/user")
                .setHeartbeatValue(new long[] { 10000, 10000 })
                .setTaskScheduler(new org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler() {
                    {
                        setPoolSize(2);
                        setThreadNamePrefix("ws-heartbeat-");
                        initialize();
                    }
                });

        // Set prefix for user-specific destinations
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(8192 * 8)
                .setSendBufferSizeLimit(512 * 1024)
                .setSendTimeLimit(20 * 1000)
                .setMessageSizeLimit(512 * 1024);
    }
}