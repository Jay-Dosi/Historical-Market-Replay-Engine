package com.marketreplay.service;

import com.marketreplay.model.MarketTick;
import com.marketreplay.model.OutboundMessage;
import com.marketreplay.model.ReplaySessionState;
import com.marketreplay.model.TickData;
import com.marketreplay.websocket.WebSocketSessionRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * The Time-Warp Engine.
 *
 * Core algorithm:
 *   delay_ms = clamp( (tick[n+1].ts - tick[n].ts).toMillis() / speedMultiplier, 0, maxDelay )
 *
 * Example — 1-minute candles at 60x speed:
 *   delta  = 60_000 ms
 *   delay  = 60_000 / 60 = 1_000 ms  (emits exactly one candle per second)
 */
@Service
public class ReplayEngineService {

    private static final Logger log = LoggerFactory.getLogger(ReplayEngineService.class);

    private final ScheduledExecutorService  scheduler;
    private final SessionManagerService     sessionManager;
    private final WebSocketSessionRegistry  sessionRegistry;
    private final long                      maxTickDelayMs;
    private final long                      bufferWaitMs;

    public ReplayEngineService(
            @Qualifier("replayScheduler") ScheduledExecutorService scheduler,
            SessionManagerService sessionManager,
            WebSocketSessionRegistry sessionRegistry,
            @Value("${app.replay.max-tick-delay-ms:5000}") long maxTickDelayMs,
            @Value("${app.replay.buffer-wait-ms:50}")      long bufferWaitMs) {
        this.scheduler       = scheduler;
        this.sessionManager  = sessionManager;
        this.sessionRegistry = sessionRegistry;
        this.maxTickDelayMs  = maxTickDelayMs;
        this.bufferWaitMs    = bufferWaitMs;
    }

    // -----------------------------------------------------------------------
    // Public lifecycle API
    // -----------------------------------------------------------------------

    public void startReplay(String sessionId) {
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state == null) {
            log.warn("startReplay: session not found — {}", sessionId);
            return;
        }
        state.getDataBuffer().initialize();
        state.markStarted();
        sendStatus(sessionId, "STARTED");
        scheduleNextEmission(sessionId, 0L);
        log.info("[Session {}] Replay STARTED at {}x speed", sessionId, state.getConfig().getSpeed());
    }

    public void pauseReplay(String sessionId) {
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state != null && state.markPaused()) {
            ScheduledFuture<?> pending = state.getNextTickFuture();
            if (pending != null) pending.cancel(false);
            sendStatus(sessionId, "PAUSED");
            log.info("[Session {}] Replay PAUSED", sessionId);
        }
    }

    public void resumeReplay(String sessionId) {
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state != null && state.markResumed()) {
            sendStatus(sessionId, "RESUMED");
            scheduleNextEmission(sessionId, 0L);
            log.info("[Session {}] Replay RESUMED", sessionId);
        }
    }

    public void stopReplay(String sessionId) {
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state != null && !state.isStopped()) {
            state.stop();
            sendStatus(sessionId, "STOPPED");
            log.info("[Session {}] Replay STOPPED", sessionId);
        }
    }

    // -----------------------------------------------------------------------
    // Core recursive emission loop
    // -----------------------------------------------------------------------

    private void scheduleNextEmission(String sessionId, long delayMs) {
        ScheduledFuture<?> future = scheduler.schedule(
                () -> emitNextTick(sessionId), delayMs, TimeUnit.MILLISECONDS);
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state != null) {
            state.setNextTickFuture(future);
        }
    }

    private void emitNextTick(String sessionId) {
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state == null || state.isStopped() || state.isPaused()) return;

        DataBufferService buffer = state.getDataBuffer();

        if (buffer.isExhausted()) {
            state.markCompleted();
            sendStatus(sessionId, "COMPLETED");
            log.info("[Session {}] Replay COMPLETED", sessionId);
            return;
        }

        if (buffer.isEmpty()) {
            scheduleNextEmission(sessionId, bufferWaitMs);
            return;
        }

        MarketTick current = buffer.poll();
        if (current == null) {
            scheduleNextEmission(sessionId, bufferWaitMs);
            return;
        }

        state.setLastEmittedTick(current);
        sessionRegistry.sendMessage(sessionId,
                OutboundMessage.of(OutboundMessage.Type.TICK, TickData.from(current)));

        long nextDelayMs = computeDelay(current, buffer.peek(), state.getConfig().getSpeed());
        scheduleNextEmission(sessionId, nextDelayMs);
    }

    /**
     * Computes wall-clock delay before the next tick emission.
     *
     * delay = clamp( deltaMs / speed, 0, maxTickDelayMs )
     */
    private long computeDelay(MarketTick current, MarketTick next, double speed) {
        if (next == null) return bufferWaitMs;
        long deltaMs = next.getTickId().getTimestamp().toEpochMilli()
                - current.getTickId().getTimestamp().toEpochMilli();
        if (deltaMs <= 0) return 0L;
        long adjusted = (long) (deltaMs / speed);
        return Math.min(adjusted, maxTickDelayMs);
    }

    private void sendStatus(String sessionId, String status) {
        sessionRegistry.sendMessage(sessionId,
                OutboundMessage.of(OutboundMessage.Type.REPLAY_STATUS, status));
    }
}
