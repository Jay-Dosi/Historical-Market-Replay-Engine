package com.marketreplay.model;

import java.time.Instant;

public class ExecutionReport {

    public enum Status { FILLED, REJECTED }

    private String                 orderId;
    private String                 symbol;
    private OrderRequest.OrderType type;
    private long                   quantity;
    private double                 executedPrice;
    private double                 totalValue;
    private Status                 status;
    private String                 message;
    private Instant                executedAt;

    public ExecutionReport() {}

    public String                 getOrderId()       { return orderId; }
    public void                   setOrderId(String orderId) { this.orderId = orderId; }

    public String                 getSymbol()        { return symbol; }
    public void                   setSymbol(String symbol) { this.symbol = symbol; }

    public OrderRequest.OrderType getType()          { return type; }
    public void                   setType(OrderRequest.OrderType type) { this.type = type; }

    public long                   getQuantity()      { return quantity; }
    public void                   setQuantity(long quantity) { this.quantity = quantity; }

    public double                 getExecutedPrice() { return executedPrice; }
    public void                   setExecutedPrice(double executedPrice) { this.executedPrice = executedPrice; }

    public double                 getTotalValue()    { return totalValue; }
    public void                   setTotalValue(double totalValue) { this.totalValue = totalValue; }

    public Status                 getStatus()        { return status; }
    public void                   setStatus(Status status) { this.status = status; }

    public String                 getMessage()       { return message; }
    public void                   setMessage(String message) { this.message = message; }

    public Instant                getExecutedAt()    { return executedAt; }
    public void                   setExecutedAt(Instant executedAt) { this.executedAt = executedAt; }
}
