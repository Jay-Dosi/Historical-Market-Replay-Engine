package com.marketreplay.model;

import java.time.Instant;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

public class Portfolio {

    private final String sessionId;
    private final double initialCash;

    private double cashBalance;
    private final ConcurrentHashMap<String, Long> positions;

    public Portfolio(String sessionId, double initialCash) {
        this.sessionId   = sessionId;
        this.initialCash = initialCash;
        this.cashBalance = initialCash;
        this.positions   = new ConcurrentHashMap<>();
    }

    public synchronized boolean executeBuy(String symbol, long quantity, double price) {
        double cost = price * quantity;
        if (cashBalance < cost) return false;
        cashBalance -= cost;
        positions.merge(symbol, quantity, Long::sum);
        return true;
    }

    public synchronized boolean executeSell(String symbol, long quantity, double price) {
        long held = positions.getOrDefault(symbol, 0L);
        if (held < quantity) return false;
        long remaining = held - quantity;
        if (remaining == 0L) positions.remove(symbol);
        else positions.put(symbol, remaining);
        cashBalance += price * quantity;
        return true;
    }

    public long getPosition(String symbol) {
        return positions.getOrDefault(symbol, 0L);
    }

    public synchronized double getCashBalance() {
        return cashBalance;
    }

    public synchronized PortfolioSnapshot getSnapshot() {
        double pnl = cashBalance - initialCash;
        return new PortfolioSnapshot(
                sessionId, cashBalance, initialCash, pnl,
                new HashMap<>(positions), Instant.now()
        );
    }

    public String getSessionId()   { return sessionId; }
    public double getInitialCash() { return initialCash; }
}
