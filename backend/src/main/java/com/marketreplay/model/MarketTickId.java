package com.marketreplay.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class MarketTickId implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Column(name = "ts", nullable = false)
    private Instant timestamp;

    @Column(name = "id", nullable = false)
    private UUID id;

    public MarketTickId() {}

    public MarketTickId(Instant timestamp, UUID id) {
        this.timestamp = timestamp;
        this.id = id;
    }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MarketTickId that)) return false;
        return Objects.equals(timestamp, that.timestamp) && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(timestamp, id);
    }

    @Override
    public String toString() {
        return "MarketTickId{ts=" + timestamp + ", id=" + id + "}";
    }
}
