package com.marketreplay.service;

import com.marketreplay.model.MarketTick;
import com.marketreplay.model.MarketTickId;
import com.marketreplay.repository.MarketTickRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Populates TimescaleDB with synthetic OHLCV data on first boot so the engine
 * is immediately usable after a clean docker-compose up.
 *
 * Seeds AAPL, TSLA, and SPY with 5 trading days of 1-minute candles each
 * (390 candles/day × 5 days = 1,950 rows per symbol, 5,850 total).
 */
@Service
public class DataSeederService {

    private static final Logger log = LoggerFactory.getLogger(DataSeederService.class);

    private static final int MINUTES_PER_DAY = 390; // NYSE 09:30–16:00

    private final MarketTickRepository repository;
    private final boolean              seedEnabled;

    public DataSeederService(
            MarketTickRepository repository,
            @Value("${app.seed.enabled:true}") boolean seedEnabled) {
        this.repository  = repository;
        this.seedEnabled = seedEnabled;
    }

    @PostConstruct
    public void seed() {
        if (!seedEnabled) {
            log.info("Data seeding disabled");
            return;
        }
        seedSymbol("AAPL", "US", "NASDAQ", 182.50, 5);
        seedSymbol("TSLA", "US", "NASDAQ", 248.10, 5);
        seedSymbol("SPY",  "US", "NYSE",   456.70, 5);
    }

    private void seedSymbol(String symbol, String region, String exchange,
                            double startPrice, int tradingDays) {
        if (repository.existsBySymbol(symbol)) {
            log.info("Seed: {} already present — skipping", symbol);
            return;
        }

        log.info("Seeding {} trading days of 1-min data for {} on {}…",
                tradingDays, symbol, exchange);

        List<MarketTick> batch   = new ArrayList<>(MINUTES_PER_DAY);
        Random           rng     = new Random(symbol.hashCode());
        double           price   = startPrice;
        ZonedDateTime    dayStart = ZonedDateTime.of(2024, 1, 2, 9, 30, 0, 0, ZoneOffset.UTC);
        int              seeded   = 0;

        while (seeded < tradingDays) {
            if (dayStart.getDayOfWeek() == DayOfWeek.SATURDAY
                    || dayStart.getDayOfWeek() == DayOfWeek.SUNDAY) {
                dayStart = dayStart.plusDays(1);
                continue;
            }

            for (int m = 0; m < MINUTES_PER_DAY; m++) {
                Instant ts     = dayStart.plusMinutes(m).toInstant();
                double  change = price * (rng.nextGaussian() * 0.0015 + 0.00005);
                double  open   = price;
                double  close  = Math.max(price + change, 0.01);
                double  vol    = Math.abs(change) * 2.0;
                double  high   = Math.max(open, close) + Math.abs(rng.nextGaussian() * vol);
                double  low    = Math.min(open, close) - Math.abs(rng.nextGaussian() * vol);
                long    volume = 50_000L + (long) (rng.nextDouble() * 450_000L);

                batch.add(new MarketTick(
                        new MarketTickId(ts, UUID.randomUUID()),
                        symbol, region, exchange,
                        round(open), round(high), round(low), round(close), volume));

                price = close;

                if (batch.size() == 500) {
                    repository.saveAll(batch);
                    batch.clear();
                }
            }

            dayStart = dayStart.plusDays(1);
            seeded++;
        }

        if (!batch.isEmpty()) repository.saveAll(batch);

        log.info("Seeded {} 1-min ticks for {}", tradingDays * MINUTES_PER_DAY, symbol);
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
