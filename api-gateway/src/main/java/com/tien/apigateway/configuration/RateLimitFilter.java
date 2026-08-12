package com.tien.apigateway.configuration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tien.apigateway.dto.ApiResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Giới hạn tần suất request theo (IP + nhóm endpoint), dùng thuật toán cửa sổ cố định.
 *
 * <p>Chạy TRƯỚC {@link AuthenticationFilter} (order -1) để một trận brute-force vào
 * /auth/token bị chặn ngay tại cổng, không kịp tạo ra một lượt introspect cho mỗi
 * request.
 *
 * <p>Bộ đếm nằm trong bộ nhớ của tiến trình gateway. Với một gateway đơn lẻ như hiện
 * tại thì đủ; nếu sau này chạy nhiều bản sao gateway thì phải chuyển bộ đếm sang Redis,
 * vì mỗi bản sao đang đếm riêng.
 */
@Component
@Slf4j
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RateLimitFilter implements GlobalFilter, Ordered {

    private static final int RATE_LIMITED_CODE = 1429;

    /** Một quy tắc: hậu tố đường dẫn cần khớp, số request tối đa và độ dài cửa sổ. */
    private record Rule(String pathContains, int limit, Duration window, String label) {}

    /**
     * Các đường dẫn nhạy cảm được siết chặt hơn nhiều so với mức chung. Xét theo thứ
     * tự, quy tắc khớp đầu tiên thắng, nên phải xếp cụ thể trước tổng quát.
     */
    private static final List<Rule> RULES = List.of(
            new Rule("/identity/auth/token", 5, Duration.ofMinutes(1), "đăng nhập"),
            // 30/giờ vẫn chặn được việc tạo tài khoản hàng loạt, đồng thời không cản
            // seed dữ liệu demo hay việc đăng ký thử nhiều lần trong một buổi trình bày.
            new Rule("/identity/auth/registration", 30, Duration.ofHours(1), "đăng ký"),
            new Rule("/identity/auth/forgot-password", 5, Duration.ofHours(1), "quên mật khẩu"),
            new Rule("/identity/auth/resend-verification", 5, Duration.ofHours(1), "gửi lại mã"),
            new Rule("/moderation/reports", 20, Duration.ofHours(1), "báo cáo"));

    /** Mức chung cho mọi đường dẫn còn lại. */
    private static final Rule DEFAULT_RULE = new Rule("", 120, Duration.ofMinutes(1), "chung");

    /** Dọn các cửa sổ đã hết hạn khi map phình quá ngưỡng này. */
    private static final int CLEANUP_THRESHOLD = 10_000;

    private static class Window {
        final AtomicInteger count = new AtomicInteger();
        volatile Instant resetAt;

        Window(Instant resetAt) {
            this.resetAt = resetAt;
        }
    }

    Map<String, Window> windows = new ConcurrentHashMap<>();
    ObjectMapper objectMapper;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        Rule rule = RULES.stream()
                .filter(r -> path.contains(r.pathContains()))
                .findFirst()
                .orElse(DEFAULT_RULE);

        String key = clientKey(request) + "|" + rule.label();
        Instant now = Instant.now();

        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.values().removeIf(w -> w.resetAt.isBefore(now));
        }

        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || existing.resetAt.isBefore(now)) {
                return new Window(now.plus(rule.window()));
            }
            return existing;
        });

        int used = window.count.incrementAndGet();
        if (used > rule.limit()) {
            long retryAfter = Math.max(1, Duration.between(now, window.resetAt).getSeconds());
            log.warn("Chặn vì vượt giới hạn ({}): {} lần cho {}", rule.label(), used, key);
            return tooManyRequests(exchange.getResponse(), rule, retryAfter);
        }

        exchange.getResponse().getHeaders().add("X-RateLimit-Limit", String.valueOf(rule.limit()));
        exchange.getResponse()
                .getHeaders()
                .add("X-RateLimit-Remaining", String.valueOf(Math.max(0, rule.limit() - used)));

        return chain.filter(exchange);
    }

    /**
     * Định danh phía gọi. Ưu tiên X-Forwarded-For khi có proxy đứng trước; lấy IP đầu
     * tiên trong chuỗi vì đó là client thật.
     */
    private String clientKey(ServerHttpRequest request) {
        String forwarded = request.getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddress() != null
                ? request.getRemoteAddress().getAddress().getHostAddress()
                : "unknown";
    }

    private Mono<Void> tooManyRequests(ServerHttpResponse response, Rule rule, long retryAfter) {
        String message = String.format(
                "Bạn thao tác quá nhanh (giới hạn %d lần cho thao tác %s). Thử lại sau %d giây.",
                rule.limit(), rule.label(), retryAfter);

        ApiResponse<?> apiResponse =
                ApiResponse.builder().code(RATE_LIMITED_CODE).message(message).build();

        String body;
        try {
            body = objectMapper.writeValueAsString(apiResponse);
        } catch (JsonProcessingException e) {
            body = String.format("{\"code\":%d,\"message\":\"Quá nhiều yêu cầu\"}", RATE_LIMITED_CODE);
        }

        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        response.getHeaders().add("Retry-After", String.valueOf(retryAfter));

        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }

    /** Trước AuthenticationFilter (order 0) để chặn sớm nhất có thể. */
    @Override
    public int getOrder() {
        return -1;
    }
}
