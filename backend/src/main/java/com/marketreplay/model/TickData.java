package com.marketreplay.model;

import java.time.Instant;

public class TickData {

    private Instant timestamp;
    private String  symbol;
    private String  region;
    private String  exchange;
    private double  open;
    private double  high;
    private double  low;
    private double  close;
    private long    volume;

    public TickData() {}

    public TickData(Instant timestamp, String symbol, String region, String exchange,
                    double open, double high, double low, double close, long volume) {
        this.timestamp = timestamp;
        this.symbol    = symbol;
        this.region    = region;
        this.exchange  = exchange;
        this.open      = open;
        this.high      = high;
        this.low       = low;
        this.close     = close;
        this.volume    = volume;
    }

    public static TickData from(MarketTick tick) {
        return new TickData(
                tick.getTickId().getTimestamp(),
                tick.getSymbol(),
                tick.getRegion(),
                tick.getExchange(),
                tick.getOpen(),
                tick.getHigh(),
                tick.getLow(),
                tick.getClose(),
                tick.getVolume()
        );
    }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getSymbol()   { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getRegion()   { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public double getOpen()  { return open; }
    public void setOpen(double open) { this.open = open; }

    public double getHigh()  { return high; }
    public void setHigh(double high) { this.high = high; }

    public double getLow()   { return low; }
    public void setLow(double low) { this.low = low; }

    public double getClose() { return close; }
    public void setClose(double close) { this.close = close; }

    public long getVolume()  { return volume; }
    public void setVolume(long volume) { this.volume = volume; }
}
