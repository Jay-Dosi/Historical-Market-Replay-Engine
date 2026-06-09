package com.marketreplay.model;

import java.time.Instant;
import java.util.Map;

public class PortfolioSnapshot {

    private final String            sessionId;
    private final double            cashBalance;
    private final double            initialCash;
    private final double            unrealizedPnl;
    private final Map<String, Long> positions;
    private final Instant           snapshotTime;

    public PortfolioSnapshot(String sessionId, double cashBalance, double initialCash,
                             double unrealizedPnl, Map<String, Long> positions,
                             Instant snapshotTime) {
        this.sessionId     = sessionId;
        this.cashBalance   = cashBalance;
        this.initialCash   = initialCash;
        this.unrealizedPnl = unrealizedPnl;
        this.positions     = positions;
        this.snapshotTime  = snapshotTime;
    }

    public String            getSessionId()     { return sessionId; }
    public double            getCashBalance()   { return cashBalance; }
    public double            getInitialCash()   { return initialCash; }
    public double            getUnrealizedPnl() { return unrealizedPnl; }
    public Map<String, Long> getPositions()     { return positions; }
    public Instant           getSnapshotTime()  { return snapshotTime; }
}
