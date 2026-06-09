package com.marketreplay.repository;

import com.marketreplay.model.MarketTick;
import com.marketreplay.model.MarketTickId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface MarketTickRepository extends JpaRepository<MarketTick, MarketTickId> {

    @Query("""
           SELECT m FROM MarketTick m
           WHERE m.symbol = :symbol
             AND m.tickId.timestamp >= :start
             AND m.tickId.timestamp <= :end
           ORDER BY m.tickId.timestamp ASC
           """)
    Page<MarketTick> findBySymbolAndTimeRange(
            @Param("symbol") String symbol,
            @Param("start")  Instant start,
            @Param("end")    Instant end,
            Pageable pageable
    );

    @Query("""
           SELECT m FROM MarketTick m
           WHERE m.symbol   = :symbol
             AND m.region   = :region
             AND m.exchange = :exchange
             AND m.tickId.timestamp >= :start
             AND m.tickId.timestamp <= :end
           ORDER BY m.tickId.timestamp ASC
           """)
    Page<MarketTick> findBySymbolAndExchangeAndTimeRange(
            @Param("symbol")   String symbol,
            @Param("region")   String region,
            @Param("exchange") String exchange,
            @Param("start")    Instant start,
            @Param("end")      Instant end,
            Pageable pageable
    );

    boolean existsBySymbol(String symbol);

    long countBySymbolAndTickIdTimestampBetween(String symbol, Instant start, Instant end);
}
