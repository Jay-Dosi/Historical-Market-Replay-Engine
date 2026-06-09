package com.marketreplay.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketreplay.model.MarketTick;
import com.marketreplay.model.MarketTickId;
import com.marketreplay.repository.MarketTickRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class HistoricalDataFetcherService {

    private static final Logger log = LoggerFactory.getLogger(HistoricalDataFetcherService.class);
    private static final String YF_URL = "https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=%s";

    private final MarketTickRepository repository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public HistoricalDataFetcherService(MarketTickRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Checks if data exists in DB. If not, fetches from Yahoo Finance async and saves it.
     */
    public CompletableFuture<Void> fetchAndSaveIfMissing(String symbol, Instant start, Instant end, String dataSource) {
        if (!"YAHOO_API".equals(dataSource)) {
            return CompletableFuture.completedFuture(null);
        }

        long count = repository.countBySymbolAndTickIdTimestampBetween(symbol, start, end);
        if (count > 0) {
            log.info("Data already exists locally for {} between {} and {}. Using local cache.", symbol, start, end);
            return CompletableFuture.completedFuture(null);
        }

        return CompletableFuture.runAsync(() -> {
            try {
                log.info("Downloading historical data for {} from Yahoo Finance API...", symbol);
                
                // Smart interval: if range is within last 7 days from NOW, use 1m. Else use 1d.
                String interval = "1d";
                Instant sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);
                if (start.isAfter(sevenDaysAgo)) {
                    interval = "1m";
                }

                String url = String.format(YF_URL, symbol, start.getEpochSecond(), end.getEpochSecond(), interval);
                log.info("Yahoo Finance URL: {}", url);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(15))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    throw new RuntimeException("Yahoo Finance API returned status " + response.statusCode());
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode result = root.path("chart").path("result").get(0);
                
                if (result == null) {
                    throw new RuntimeException("No data found for symbol " + symbol);
                }

                JsonNode timestamps = result.path("timestamp");
                JsonNode quote = result.path("indicators").path("quote").get(0);
                
                if (timestamps.isMissingNode() || quote.isMissingNode()) {
                    throw new RuntimeException("Incomplete data structure from Yahoo API");
                }

                JsonNode opens = quote.path("open");
                JsonNode highs = quote.path("high");
                JsonNode lows = quote.path("low");
                JsonNode closes = quote.path("close");
                JsonNode volumes = quote.path("volume");

                List<MarketTick> ticks = new ArrayList<>();
                for (int i = 0; i < timestamps.size(); i++) {
                    if (closes.get(i).isNull()) continue; // Skip empty periods

                    long tsSec = timestamps.get(i).asLong();
                    Instant tickTs = Instant.ofEpochSecond(tsSec);
                    
                    double open = opens.get(i).asDouble();
                    double high = highs.get(i).asDouble();
                    double low = lows.get(i).asDouble();
                    double close = closes.get(i).asDouble();
                    long volume = volumes.get(i).asLong();

                    ticks.add(new MarketTick(
                            new MarketTickId(tickTs, UUID.randomUUID()),
                            symbol.toUpperCase(), "US", "YAHOO",
                            open, high, low, close, volume));
                }

                if (!ticks.isEmpty()) {
                    repository.saveAll(ticks);
                    log.info("Saved {} ticks for {} to TimescaleDB.", ticks.size(), symbol);
                } else {
                    log.warn("No valid ticks found in the date range for {}", symbol);
                }

            } catch (Exception e) {
                log.error("Failed to fetch data from Yahoo Finance API: {}", e.getMessage(), e);
                throw new RuntimeException("Data download failed: " + e.getMessage(), e);
            }
        });
    }
}
