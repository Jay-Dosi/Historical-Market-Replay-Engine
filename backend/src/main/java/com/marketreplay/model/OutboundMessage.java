package com.marketreplay.model;

import java.time.Instant;

public class OutboundMessage<T> {

    public enum Type {
        TICK,
        EXECUTION_REPORT,
        PORTFOLIO_SNAPSHOT,
        REPLAY_STATUS,
        BUFFER_STATUS,
        ERROR
    }

    private Type    type;
    private Instant serverTimestamp;
    private T       data;

    public OutboundMessage() {}

    private OutboundMessage(Type type, T data) {
        this.type            = type;
        this.data            = data;
        this.serverTimestamp = Instant.now();
    }

    public static <T> OutboundMessage<T> of(Type type, T data) {
        return new OutboundMessage<>(type, data);
    }

    public Type    getType()            { return type; }
    public void    setType(Type type)   { this.type = type; }

    public Instant getServerTimestamp() { return serverTimestamp; }
    public void    setServerTimestamp(Instant ts) { this.serverTimestamp = ts; }

    public T       getData()            { return data; }
    public void    setData(T data)      { this.data = data; }
}
