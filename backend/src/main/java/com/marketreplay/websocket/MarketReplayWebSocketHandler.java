package com.marketreplay.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketreplay.model.InboundMessage;
import com.marketreplay.model.OrderRequest;
import com.marketreplay.model.OutboundMessage;
import com.marketreplay.model.SubscribeRequest;
import com.marketreplay.service.PaperTradingService;
import com.marketreplay.service.ReplayEngineService;
import com.marketreplay.service.SessionManagerService;
import com.marketreplay.service.HistoricalDataFetcherService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class MarketReplayWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(MarketReplayWebSocketHandler.class);

    private final ObjectMapper             objectMapper;
    private final WebSocketSessionRegistry sessionRegistry;
    private final SessionManagerService    sessionManager;
    private final ReplayEngineService      replayEngine;
    private final PaperTradingService      tradingService;
    private final HistoricalDataFetcherService fetcherService;

    public MarketReplayWebSocketHandler(ObjectMapper objectMapper,
                                        WebSocketSessionRegistry sessionRegistry,
                                        SessionManagerService sessionManager,
                                        ReplayEngineService replayEngine,
                                        PaperTradingService tradingService,
                                        HistoricalDataFetcherService fetcherService) {
        this.objectMapper    = objectMapper;
        this.sessionRegistry = sessionRegistry;
        this.sessionManager  = sessionManager;
        this.replayEngine    = replayEngine;
        this.tradingService  = tradingService;
        this.fetcherService  = fetcherService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String id = session.getId();
        sessionRegistry.register(id, session);
        log.info("WS connected: {} from {}", id, session.getRemoteAddress());
        sessionRegistry.sendMessage(id,
                OutboundMessage.of(OutboundMessage.Type.REPLAY_STATUS, "CONNECTED"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String id = session.getId();
        log.info("WS closed: {} status={}", id, status);
        replayEngine.stopReplay(id);
        sessionManager.destroySession(id);
        sessionRegistry.unregister(id);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WS transport error {}: {}", session.getId(), exception.getMessage());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String id = session.getId();
        try {
            InboundMessage inbound = objectMapper.readValue(
                    message.getPayload(), InboundMessage.class);

            if (inbound.getAction() == null) {
                sendError(id, "Missing 'action' field.");
                return;
            }

            switch (inbound.getAction()) {
                case SUBSCRIBE -> handleSubscribe(id, inbound);
                case ORDER     -> handleOrder(id, inbound);
                case PAUSE     -> replayEngine.pauseReplay(id);
                case RESUME    -> replayEngine.resumeReplay(id);
                case STOP      -> {
                    replayEngine.stopReplay(id);
                    sessionManager.destroySession(id);
                }
            }
        } catch (Exception e) {
            log.error("[Session {}] Message processing error: {}", id, e.getMessage(), e);
            sendError(id, "Failed to process message: " + e.getMessage());
        }
    }

    private void handleSubscribe(String sessionId, InboundMessage inbound) throws Exception {
        if (inbound.getPayload() == null || inbound.getPayload().isNull()) {
            sendError(sessionId, "SUBSCRIBE requires a payload.");
            return;
        }
        SubscribeRequest config =
                objectMapper.treeToValue(inbound.getPayload(), SubscribeRequest.class);
        if (config.getSymbol() == null || config.getSymbol().isBlank()) {
            sendError(sessionId, "SUBSCRIBE: 'symbol' is required.");
            return;
        }
        if (config.getStartDate() == null || config.getEndDate() == null) {
            sendError(sessionId, "SUBSCRIBE: 'startDate' and 'endDate' are required.");
            return;
        }
        if (!config.getEndDate().isAfter(config.getStartDate())) {
            sendError(sessionId, "SUBSCRIBE: 'endDate' must be after 'startDate'.");
            return;
        }
        if (config.getSpeed() <= 0) config.setSpeed(1.0);

        if ("YAHOO_API".equals(config.getDataSource())) {
            sessionRegistry.sendMessage(sessionId,
                    OutboundMessage.of(OutboundMessage.Type.REPLAY_STATUS, "DOWNLOADING_DATA"));
            
            fetcherService.fetchAndSaveIfMissing(config.getSymbol(), config.getStartDate(), config.getEndDate(), config.getDataSource())
                    .thenRun(() -> {
                        sessionManager.createSession(sessionId, config);
                        replayEngine.startReplay(sessionId);
                    })
                    .exceptionally(ex -> {
                        sendError(sessionId, "Failed to download data: " + ex.getMessage());
                        return null;
                    });
        } else {
            sessionManager.createSession(sessionId, config);
            replayEngine.startReplay(sessionId);
        }
    }

    private void handleOrder(String sessionId, InboundMessage inbound) throws Exception {
        if (!sessionManager.hasSession(sessionId)) {
            sendError(sessionId, "No active session. Send SUBSCRIBE first.");
            return;
        }
        if (inbound.getPayload() == null || inbound.getPayload().isNull()) {
            sendError(sessionId, "ORDER requires a payload.");
            return;
        }
        OrderRequest order =
                objectMapper.treeToValue(inbound.getPayload(), OrderRequest.class);
        if (order.getSymbol() == null || order.getSymbol().isBlank()) {
            sendError(sessionId, "ORDER: 'symbol' is required.");
            return;
        }
        if (order.getType() == null) {
            sendError(sessionId, "ORDER: 'type' must be BUY or SELL.");
            return;
        }
        if (order.getQuantity() <= 0) {
            sendError(sessionId, "ORDER: 'quantity' must be positive.");
            return;
        }
        tradingService.processOrder(sessionId, order);
    }

    private void sendError(String sessionId, String message) {
        sessionRegistry.sendMessage(sessionId,
                OutboundMessage.of(OutboundMessage.Type.ERROR, message));
    }
}
