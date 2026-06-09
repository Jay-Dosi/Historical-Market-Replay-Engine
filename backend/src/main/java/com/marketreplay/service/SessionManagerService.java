package com.marketreplay.service;

import com.marketreplay.model.Portfolio;
import com.marketreplay.model.ReplaySessionState;
import com.marketreplay.model.SubscribeRequest;
import com.marketreplay.repository.MarketTickRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class SessionManagerService {

    private static final Logger log = LoggerFactory.getLogger(SessionManagerService.class);

    private final ConcurrentHashMap<String, ReplaySessionState> sessions;
    private final MarketTickRepository                          repository;
    private final ExecutorService                               prefetchExecutor;
    private final int                                           chunkSize;
    private final int                                           refillThreshold;

    public SessionManagerService(
            MarketTickRepository repository,
            @Value("${app.buffer.chunk-size:500}")       int chunkSize,
            @Value("${app.buffer.refill-threshold:100}") int refillThreshold) {
        this.repository       = repository;
        this.chunkSize        = chunkSize;
        this.refillThreshold  = refillThreshold;
        this.sessions         = new ConcurrentHashMap<>();
        this.prefetchExecutor = Executors.newCachedThreadPool(
                new NamedDaemonThreadFactory("prefetch-worker"));
    }

    /**
     * Creates a new session, stopping any existing one with the same ID first.
     */
    public ReplaySessionState createSession(String sessionId, SubscribeRequest config) {
        destroySession(sessionId);

        DataBufferService buffer = new DataBufferService(
                sessionId, repository, config, prefetchExecutor, chunkSize, refillThreshold);

        double cash = config.getInitialCash() > 0 ? config.getInitialCash() : 100_000.0;
        Portfolio portfolio = new Portfolio(sessionId, cash);

        ReplaySessionState state = new ReplaySessionState(sessionId, config, buffer, portfolio);
        sessions.put(sessionId, state);
        log.info("Session created: {} config={}", sessionId, config);
        return state;
    }

    public ReplaySessionState getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    public void destroySession(String sessionId) {
        ReplaySessionState existing = sessions.remove(sessionId);
        if (existing != null) {
            existing.stop();
            log.info("Session destroyed: {}", sessionId);
        }
    }

    public boolean hasSession(String sessionId) {
        return sessions.containsKey(sessionId);
    }

    public int getActiveSessionCount() {
        return sessions.size();
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down SessionManagerService — {} active sessions", sessions.size());
        sessions.values().forEach(ReplaySessionState::stop);
        sessions.clear();
        prefetchExecutor.shutdown();
        try {
            if (!prefetchExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                prefetchExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            prefetchExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    private static final class NamedDaemonThreadFactory implements ThreadFactory {
        private final String        prefix;
        private final AtomicInteger counter = new AtomicInteger(0);

        NamedDaemonThreadFactory(String prefix) { this.prefix = prefix; }

        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, prefix + "-" + counter.incrementAndGet());
            t.setDaemon(true);
            return t;
        }
    }
}
