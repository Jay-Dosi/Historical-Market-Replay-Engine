package com.marketreplay.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class OrderRequest {

    public enum OrderType { BUY, SELL }

    @NotBlank
    private String symbol;

    @NotNull
    private OrderType type;

    @Positive
    private long quantity;

    public OrderRequest() {}

    public String    getSymbol()   { return symbol; }
    public void      setSymbol(String symbol) { this.symbol = symbol; }

    public OrderType getType()     { return type; }
    public void      setType(OrderType type) { this.type = type; }

    public long      getQuantity() { return quantity; }
    public void      setQuantity(long quantity) { this.quantity = quantity; }

    @Override
    public String toString() {
        return "OrderRequest{symbol=" + symbol + ", type=" + type + ", qty=" + quantity + "}";
    }
}
