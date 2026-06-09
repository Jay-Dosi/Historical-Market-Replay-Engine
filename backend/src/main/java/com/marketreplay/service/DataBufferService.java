package com.marketreplay.service;

import com.marketreplay.model.MarketTick;
import com.marketreplay.model.SubscribeRequest;
import com.marketreplay.repository.MarketTickRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Per-session lock-free memory buffer that pre-fetches historical ticks from
 * TimescaleDB via keyset pagination to eliminate DB I/O latency during replay.
 */
public class DataBufferService {

    private static final Logger log = LoggerFactory.getLogger(DataBufferService.class);

    private final String               sessionId;
    private final MarketTickRepository repository;
    private final SubscribeRequest     config;
    private final ExecutorService      prefetchExecutor;
    private final int                  chunkSize;
    private final int                  refillThreshold;

    private final ConcurrentLinkedQueue<MarketTick> tickQueue;
    private final AtomicBoolean                     prefetchInProgress;
    private final AtomicBoolean                     exhausted;
    private final AtomicReference<Instant>          nextFetchStart;
    private final AtomicInteger                     queueSize;

    public DataBufferService(String sessionId,
                             MarketTickRepository repository,
                             SubscribeRequest config,
                             ExecutorService prefetchExecutor,
                             int chunkSize,
                             int refillThreshold) {
        this.sessionId         = sessionId;
        this.repository        = repository;
        this.config            = config;
        this.prefetchExecutor  = prefetchExecutor;
        this.chunkSize         = chunkSize;
        this.refillThreshold   = refillThreshold;
        this.tickQueue         = new ConcurrentLinkedQueue<>();
        this.prefetchInProgress = new AtomicBoolean(false);
        this.exhausted         = new AtomicBoolean(false);
        this.nextFetchStart    = new AtomicReference<>(config.getStartDate());
        this.queueSize         = new AtomicInteger(0);
    }

    /** Synchronously loads the first chunk. Must be called once before replay starts. */
    public void initialize() {
        log.info("[Session {}] Initializing buffer: symbol={} [{} -> {}] speed={}x",
                sessionId, config.getSymbol(),
                config.getStartDate(), config.getEndDate(), config.getSpeed());
        loadNextChunk();
    }

    /**
     * Removes and returns the head tick, or null if the queue is empty.
     * Triggers background prefetch when the queue drops below refillThreshold.
     */
    public MarketTick poll() {
        MarketTick tick = tickQueue.poll();
        if (tick != null) {
            int remaining = queueSize.decrementAndGet();
            if (remaining < refillThreshold
                    && !exhausted.get()
                    && prefetchInProgress.compareAndSet(false, true)) {
                prefetchExecutor.submit(this::loadNextChunk);
            }
        }
        return tick;
    }

    /** Peeks at the next tick without consuming it (used for delay calculation). */
    public MarketTick peek() {
        return tickQueue.peek();
    }

    public boolean isEmpty()      { return tickQueue.isEmpty(); }
    public int     getQueueSize() { return queueSize.get(); }

    /** True when the DB cursor is exhausted AND the in-memory queue is empty. */
    public boolean isExhausted()  { return exhausted.get() && tickQueue.isEmpty(); }

    // -----------------------------------------------------------------------
    // Private: keyset-paginated background fetch
    // -----------------------------------------------------------------------

    private void loadNextChunk() {
        try {
            Instant fetchStart = nextFetchStart.get();
            if (fetchStart == null || fetchStart.isAfter(config.getEndDate())) {
                exhausted.set(true);
                log.debug("[Session {}] Buffer exhausted (cursor past endDate)", sessionId);
                return;
            }

            Page<MarketTick> page = fetchPage(fetchStart);

            if (page.isEmpty()) {
                exhausted.set(true);
                log.info("[Session {}] No more rows in DB — buffer exhausted", sessionId);
                return;
            }

            List<MarketTick> content = page.getContent();
            for (MarketTick tick : content) {
                tickQueue.offer(tick);
                queueSize.incrementAndGet();
            }

            // Advance keyset cursor to 1 ns past the last loaded tick
            MarketTick last = content.get(content.size() - 1);
            nextFetchStart.set(last.getTickId().getTimestamp().plusNanos(1));

            if (!page.hasNext()) {
                exhausted.set(true);
            }

            log.debug("[Session {}] Loaded {} ticks, queue={}, exhausted={}",
                    sessionId, content.size(), queueSize.get(), exhausted.get());

        } catch (Exception e) {
            log.error("[Session {}] Prefetch error: {}", sessionId, e.getMessage(), e);
        } finally {
            prefetchInProgress.set(false);
        }
    }

    private Page<MarketTick> fetchPage(Instant fetchStart) {
        PageRequest req = PageRequest.of(0, chunkSize);
        boolean hasExchange = config.getExchange() != null && !config.getExchange().isBlank();
        if (hasExchange) {
            return repository.findBySymbolAndExchangeAndTimeRange(
                    config.getSymbol(), config.getRegion(), config.getExchange(),
                    fetchStart, config.getEndDate(), req);
        }
        return repository.findBySymbolAndTimeRange(
                config.getSymbol(), fetchStart, config.getEndDate(), req);
    }
}
