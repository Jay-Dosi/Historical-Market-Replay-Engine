package com.marketreplay.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;

public class SubscribeRequest {

    @NotBlank
    private String symbol;

    private String region;

    private String exchange;

    @NotNull
    private Instant startDate;

    @NotNull
    private Instant endDate;

    @Positive
    @JsonProperty("speed")
    private double speed = 1.0;

    @JsonProperty("initialCash")
    private double initialCash = 100_000.0;

    private String dataSource = "LOCAL";

    public SubscribeRequest() {}

    public String  getSymbol()      { return symbol; }
    public void    setSymbol(String symbol) { this.symbol = symbol; }

    public String  getRegion()      { return region; }
    public void    setRegion(String region) { this.region = region; }

    public String  getExchange()    { return exchange; }
    public void    setExchange(String exchange) { this.exchange = exchange; }

    public Instant getStartDate()   { return startDate; }
    public void    setStartDate(Instant startDate) { this.startDate = startDate; }

    public Instant getEndDate()     { return endDate; }
    public void    setEndDate(Instant endDate) { this.endDate = endDate; }

    public double  getSpeed()       { return speed; }
    public void    setSpeed(double speed) { this.speed = speed; }

    public double  getInitialCash() { return initialCash; }
    public void    setInitialCash(double initialCash) { this.initialCash = initialCash; }

    public String  getDataSource()  { return dataSource; }
    public void    setDataSource(String dataSource) { this.dataSource = dataSource; }

    @Override
    public String toString() {
        return "SubscribeRequest{symbol=" + symbol + ", exchange=" + exchange
                + ", start=" + startDate + ", end=" + endDate + ", speed=" + speed 
                + ", dataSource=" + dataSource + "}";
    }
}
