package com.marketreplay.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionRegistry {

    private static final Logger log = LoggerFactory.getLogger(WebSocketSessionRegistry.class);

    private final ConcurrentHashMap<String, WebSocketSession> sessions;
    private final ObjectMapper                                objectMapper;

    public WebSocketSessionRegistry(ObjectMapper objectMapper) {
        this.sessions     = new ConcurrentHashMap<>();
        this.objectMapper = objectMapper;
    }

    public void register(String sessionId, WebSocketSession session) {
        sessions.put(sessionId, session);
    }

    public void unregister(String sessionId) {
        sessions.remove(sessionId);
    }

    public WebSocketSession get(String sessionId) {
        return sessions.get(sessionId);
    }

    public boolean isConnected(String sessionId) {
        WebSocketSession s = sessions.get(sessionId);
        return s != null && s.isOpen();
    }

    /**
     * Serializes payload to JSON and sends it to the named session.
     * Synchronized on the session object to prevent concurrent write corruption.
     */
    public void sendMessage(String sessionId, Object payload) {
        WebSocketSession session = sessions.get(sessionId);
        if (session == null || !session.isOpen()) return;
        try {
            String json = objectMapper.writeValueAsString(payload);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception e) {
            log.error("[Session {}] Send failed: {}", sessionId, e.getMessage());
        }
    }
}
