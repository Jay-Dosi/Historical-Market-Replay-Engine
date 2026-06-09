package com.marketreplay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class MarketReplayApplication {

    public static void main(String[] args) {
        SpringApplication.run(MarketReplayApplication.class, args);
    }
}
