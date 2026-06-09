package com.marketreplay.model;

import com.fasterxml.jackson.databind.JsonNode;

public class InboundMessage {

    public enum Action { SUBSCRIBE, ORDER, PAUSE, RESUME, STOP }

    private Action   action;
    private JsonNode payload;

    public InboundMessage() {}

    public Action   getAction()  { return action; }
    public void     setAction(Action action) { this.action = action; }

    public JsonNode getPayload() { return payload; }
    public void     setPayload(JsonNode payload) { this.payload = payload; }

    @Override
    public String toString() {
        return "InboundMessage{action=" + action + "}";
    }
}
