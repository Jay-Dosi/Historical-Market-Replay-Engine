package com.marketreplay.model;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

@Entity
@Table(
    name = "market_ticks",
    indexes = {
        @Index(name = "idx_market_ticks_symbol_ts",          columnList = "symbol, ts DESC"),
        @Index(name = "idx_market_ticks_region_exchange_ts", columnList = "region, exchange, ts DESC"),
        @Index(name = "idx_market_ticks_symbol_exchange_ts", columnList = "symbol, exchange, ts DESC")
    }
)
public class MarketTick {

    @EmbeddedId
    private MarketTickId tickId;

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;

    @Column(name = "region", nullable = false, length = 10)
    private String region;

    @Column(name = "exchange", nullable = false, length = 50)
    private String exchange;

    @Column(name = "open", nullable = false)
    private Double open;

    @Column(name = "high", nullable = false)
    private Double high;

    @Column(name = "low", nullable = false)
    private Double low;

    @Column(name = "close", nullable = false)
    private Double close;

    @Column(name = "volume", nullable = false)
    private Long volume;

    public MarketTick() {}

    public MarketTick(MarketTickId tickId, String symbol, String region, String exchange,
                      Double open, Double high, Double low, Double close, Long volume) {
        this.tickId   = tickId;
        this.symbol   = symbol;
        this.region   = region;
        this.exchange = exchange;
        this.open     = open;
        this.high     = high;
        this.low      = low;
        this.close    = close;
        this.volume   = volume;
    }

    public MarketTickId getTickId()   { return tickId; }
    public void setTickId(MarketTickId tickId) { this.tickId = tickId; }

    public String getSymbol()   { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public String getRegion()   { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public Double getOpen()     { return open; }
    public void setOpen(Double open) { this.open = open; }

    public Double getHigh()     { return high; }
    public void setHigh(Double high) { this.high = high; }

    public Double getLow()      { return low; }
    public void setLow(Double low) { this.low = low; }

    public Double getClose()    { return close; }
    public void setClose(Double close) { this.close = close; }

    public Long getVolume()     { return volume; }
    public void setVolume(Long volume) { this.volume = volume; }

    @Override
    public String toString() {
        return "MarketTick{" + tickId + ", symbol=" + symbol + ", close=" + close + "}";
    }
}
