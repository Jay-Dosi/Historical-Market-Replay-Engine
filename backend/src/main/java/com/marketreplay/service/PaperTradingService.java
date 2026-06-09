package com.marketreplay.service;

import com.marketreplay.model.ExecutionReport;
import com.marketreplay.model.MarketTick;
import com.marketreplay.model.OrderRequest;
import com.marketreplay.model.OutboundMessage;
import com.marketreplay.model.Portfolio;
import com.marketreplay.model.ReplaySessionState;
import com.marketreplay.websocket.WebSocketSessionRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Simulated Execution Venue (Paper Trading Desk).
 *
 * Executes paper orders against the close price of the last tick emitted to
 * the client, ensuring PnL is anchored to the exact historical moment the
 * trader placed their order.
 */
@Service
public class PaperTradingService {

    private static final Logger log = LoggerFactory.getLogger(PaperTradingService.class);

    private final SessionManagerService    sessionManager;
    private final WebSocketSessionRegistry sessionRegistry;

    public PaperTradingService(SessionManagerService sessionManager,
                               WebSocketSessionRegistry sessionRegistry) {
        this.sessionManager  = sessionManager;
        this.sessionRegistry = sessionRegistry;
    }

    public void processOrder(String sessionId, OrderRequest order) {
        ReplaySessionState state = sessionManager.getSession(sessionId);
        if (state == null) {
            sendRejection(sessionId, order, "No active replay session. Send SUBSCRIBE first.");
            return;
        }

        MarketTick lastTick = state.getLastEmittedTick();
        if (lastTick == null) {
            sendRejection(sessionId, order, "No price data yet. Wait for the first tick.");
            return;
        }

        if (!lastTick.getSymbol().equalsIgnoreCase(order.getSymbol())) {
            sendRejection(sessionId, order,
                    "Symbol mismatch: stream is " + lastTick.getSymbol()
                            + " but order is for " + order.getSymbol());
            return;
        }

        double executionPrice = lastTick.getClose();
        Portfolio portfolio   = state.getPortfolio();

        ExecutionReport report = switch (order.getType()) {
            case BUY  -> executeBuy(order, portfolio, executionPrice, lastTick);
            case SELL -> executeSell(order, portfolio, executionPrice, lastTick);
        };

        sessionRegistry.sendMessage(sessionId,
                OutboundMessage.of(OutboundMessage.Type.EXECUTION_REPORT, report));
        sessionRegistry.sendMessage(sessionId,
                OutboundMessage.of(OutboundMessage.Type.PORTFOLIO_SNAPSHOT,
                        portfolio.getSnapshot()));

        log.info("[Session {}] Order {} {} {} @ {} status={}",
                sessionId, report.getOrderId(), order.getType(),
                order.getQuantity(), executionPrice, report.getStatus());
    }

    // -----------------------------------------------------------------------
    // Private execution helpers
    // -----------------------------------------------------------------------

    private ExecutionReport executeBuy(OrderRequest order, Portfolio portfolio,
                                       double price, MarketTick tick) {
        boolean ok = portfolio.executeBuy(order.getSymbol(), order.getQuantity(), price);
        if (ok) {
            return buildReport(order, price, ExecutionReport.Status.FILLED,
                    "BUY filled at " + price, tick);
        }
        double cost = price * order.getQuantity();
        return buildReport(order, price, ExecutionReport.Status.REJECTED,
                String.format("Insufficient funds. Required: %.2f, Available: %.2f",
                        cost, portfolio.getCashBalance()), tick);
    }

    private ExecutionReport executeSell(OrderRequest order, Portfolio portfolio,
                                        double price, MarketTick tick) {
        boolean ok = portfolio.executeSell(order.getSymbol(), order.getQuantity(), price);
        if (ok) {
            return buildReport(order, price, ExecutionReport.Status.FILLED,
                    "SELL filled at " + price, tick);
        }
        long held = portfolio.getPosition(order.getSymbol());
        return buildReport(order, price, ExecutionReport.Status.REJECTED,
                String.format("Insufficient position for %s. Required: %d, Held: %d",
                        order.getSymbol(), order.getQuantity(), held), tick);
    }

    private ExecutionReport buildReport(OrderRequest order, double price,
                                        ExecutionReport.Status status,
                                        String message, MarketTick tick) {
        ExecutionReport r = new ExecutionReport();
        r.setOrderId(UUID.randomUUID().toString());
        r.setSymbol(order.getSymbol());
        r.setType(order.getType());
        r.setQuantity(order.getQuantity());
        r.setExecutedPrice(price);
        r.setTotalValue(price * order.getQuantity());
        r.setStatus(status);
        r.setMessage(message);
        r.setExecutedAt(tick.getTickId().getTimestamp());
        return r;
    }

    private void sendRejection(String sessionId, OrderRequest order, String reason) {
        ExecutionReport r = new ExecutionReport();
        r.setOrderId(UUID.randomUUID().toString());
        r.setSymbol(order.getSymbol());
        r.setType(order.getType());
        r.setQuantity(order.getQuantity());
        r.setExecutedPrice(0.0);
        r.setTotalValue(0.0);
        r.setStatus(ExecutionReport.Status.REJECTED);
        r.setMessage(reason);
        r.setExecutedAt(Instant.now());
        sessionRegistry.sendMessage(sessionId,
                OutboundMessage.of(OutboundMessage.Type.EXECUTION_REPORT, r));
    }
}
