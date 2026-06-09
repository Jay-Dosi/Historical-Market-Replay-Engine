package com.marketreplay.controller;

import com.marketreplay.service.SessionManagerService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final SessionManagerService sessionManager;

    public HealthController(SessionManagerService sessionManager) {
        this.sessionManager = sessionManager;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status",         "UP",
                "service",        "Market Replay Engine",
                "activeSessions", sessionManager.getActiveSessionCount(),
                "serverTime",     Instant.now().toString()
        );
    }
}
