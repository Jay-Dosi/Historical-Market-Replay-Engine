package com.marketreplay.model;

import com.marketreplay.service.DataBufferService;

import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicReference;

public class ReplaySessionState {

    public enum State { INITIALIZING, RUNNING, PAUSED, STOPPED, COMPLETED }

    private final String            sessionId;
    private final SubscribeRequest  config;
    private final DataBufferService dataBuffer;
    private final Portfolio         portfolio;

    private final AtomicReference<State>      replayState;
    private final AtomicReference<MarketTick> lastEmittedTick;

    private volatile ScheduledFuture<?> nextTickFuture;

    public ReplaySessionState(String sessionId, SubscribeRequest config,
                              DataBufferService dataBuffer, Portfolio portfolio) {
        this.sessionId       = sessionId;
        this.config          = config;
        this.dataBuffer      = dataBuffer;
        this.portfolio       = portfolio;
        this.replayState     = new AtomicReference<>(State.INITIALIZING);
        this.lastEmittedTick = new AtomicReference<>(null);
    }

    public void markStarted() {
        replayState.set(State.RUNNING);
    }

    public boolean markPaused() {
        return replayState.compareAndSet(State.RUNNING, State.PAUSED);
    }

    public boolean markResumed() {
        return replayState.compareAndSet(State.PAUSED, State.RUNNING);
    }

    public void stop() {
        replayState.set(State.STOPPED);
        if (nextTickFuture != null) {
            nextTickFuture.cancel(false);
        }
    }

    public void markCompleted() {
        replayState.set(State.COMPLETED);
    }

    public boolean isRunning()  { return replayState.get() == State.RUNNING; }
    public boolean isPaused()   { return replayState.get() == State.PAUSED; }
    public boolean isStopped()  {
        State s = replayState.get();
        return s == State.STOPPED || s == State.COMPLETED;
    }

    public State             getState()           { return replayState.get(); }
    public String            getSessionId()       { return sessionId; }
    public SubscribeRequest  getConfig()          { return config; }
    public DataBufferService getDataBuffer()      { return dataBuffer; }
    public Portfolio         getPortfolio()       { return portfolio; }

    public MarketTick        getLastEmittedTick()              { return lastEmittedTick.get(); }
    public void              setLastEmittedTick(MarketTick t)  { lastEmittedTick.set(t); }

    public ScheduledFuture<?>  getNextTickFuture()                { return nextTickFuture; }
    public void                setNextTickFuture(ScheduledFuture<?> f) { this.nextTickFuture = f; }
}
