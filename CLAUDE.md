# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ChillNet** — a social network built as 11 Spring Boot microservices (Java 17, Spring Boot 3.5.5, Spring Cloud 2025.0.0) plus two shared library modules. Educational/capstone project; the README is in Vietnamese, and much of the code's comments and user-facing error messages are Vietnamese too — match that when editing existing files.

## Build & run

**There is no root aggregator POM.** Every directory is an independent Maven project inheriting directly from `spring-boot-starter-parent`. `mvn` at the repo root does nothing — always `cd` into a service first.

The two shared modules are consumed as normal `com.tien:*:0.0.1-SNAPSHOT` dependencies from the local `~/.m2` repository, so they must be installed before any service that depends on them will build:

```bash
cd shared-common     && ./mvnw clean install   # note: shared-common/shared-contacts have no mvnw wrapper — use `mvn`
cd shared-contacts   && mvn clean install
cd post-service      && ./mvnw spring-boot:run
```

Startup order matters: **config-server (8888) → api-gateway (8080) → identity-service (8081) → everything else**. Infra required first: MySQL 3306, MongoDB 27017, Redis, Kafka on **localhost:9094**.

| Command | Where |
|---|---|
| `./mvnw spring-boot:run` | any service dir |
| `./mvnw test` | any service dir |
| `./mvnw test -Dtest=PostServiceApplicationTests` | single test |
| `./mvnw spotless:apply` | any service except gateway/config-server/shared-* |

Tests are only the generated `contextLoads` smoke tests — there is no real test suite. A "test" run therefore requires the infrastructure to be up, and passing tests proves very little.

Spotless (palantir-java-format, tabs=4 spaces, import order `java,jakarta,org,com,com.diffplug`) is configured but **not bound to a build phase** — it never runs automatically. Run `spotless:apply` manually before committing Java changes.

Required env vars: `JWT_SIGNER_KEY` (identity), `CLIENT_ID`/`CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` (identity OAuth2), `CLOUD_NAME`/`API_KEY`/`API_SECRET` (file-service Cloudinary), `BREVO_APIKEY` (notification email).

## Configuration lives in config-server, not in the services

This is the most common trap. Each service's own `src/main/resources/application.yaml` contains only:

```yaml
spring:
  application: {name: post-service}
  config: {import: "optional:configserver:http://localhost:8888"}
```

All real config — ports, context paths, datasource URIs, Kafka settings, Feign target URLs — lives in [config-server/src/main/resources/config/](config-server/src/main/resources/config/) as `<service-name>.yaml`, served in Spring Cloud Config **native** mode off the classpath. To change a service's config, edit that file and **restart config-server** (the values are baked into its classpath at build time). Because the import is `optional:`, a service will silently start with no config — and bind to a random default port — if config-server is down.

## Service map

| Service | Port | Context path | Store |
|---|---|---|---|
| api-gateway | 8080 | — | — |
| config-server | 8888 | — | — |
| identity-service | 8081 | `/identity` | MySQL `identity_service` |
| profile-service | 8082 | `/profile` | MySQL `profile_service` |
| notification-service | 8083 | `/notification` | MongoDB |
| post-service | 8084 | `/post` | MongoDB |
| file-service | 8085 | `/file` | MongoDB |
| chat-service | 8086 | `/chat` | MongoDB |
| social-service | 8087 | `/social` | MySQL `social_service` |
| interaction-service | 8088 | `/interaction` | MySQL `interaction_service` |
| group-service | 8089 | `/group` | MongoDB |

External clients call `http://localhost:8080/api/v1/<service>/**`; the gateway `StripPrefix=2` filter removes `/api/v1/<service>` and the target service's `context-path` puts it back. So a controller mapped `@GetMapping("/posts")` in post-service is reached at `/api/v1/post/posts`. The one exception is `profile_service_internal` (`/profile/internal/**`, StripPrefix=1).

Java packages don't match directory names: `post-service/` → `com.tien.postservice`, `shared-contacts/` → `com.tien.sharedcontacts`.

## Auth model

identity-service is the only issuer and the only verifier. `JwtService` signs HS512 with `jwt.signerKey`, sets **`subject` = the user's ID** (not username) and a space-delimited `scope` claim of `ROLE_*` + permissions. Revocation is a DB table of invalidated JWT IDs.

Every downstream service has its own copy of `CustomJwtDecoder` that **only parses the token and never checks the signature or the revocation list** — it trusts anything well-formed. Downstream trust therefore rests entirely on requests arriving via the gateway. Keep this in mind before assuming a service-level check is enforcing anything; it isn't a bug to fix casually, but don't add security assumptions on top of it.

Consequences for writing code in any non-identity service:
- Current user ID = `SecurityContextHolder.getContext().getAuthentication().getName()` (services wrap this in a private `getCurrentUserId()`).
- `JwtGrantedAuthoritiesConverter` runs with an **empty authority prefix**, so `@PreAuthorize` checks use the raw `ROLE_ADMIN` string.
- Each `SecurityConfig` permits `/internal/**` and the Swagger paths, and authenticates everything else.

## Cross-service communication

**Synchronous — OpenFeign.** Clients live in `repository/httpclient/`, are declared with a hardcoded `url = "${app.services.<x>.url}"` (from config-server; **no service discovery / Eureka**, no load balancing), and use each service's `FeignConfig` + `AuthenticationRequestInterceptor`, which copies the caller's `Authorization` header onto the outbound call. Feign targets always hit the callee's port directly, bypassing the gateway.

Endpoints intended for service-to-service use go in an `InternalPostController`-style class under `@RequestMapping("/internal")` — unauthenticated by `SecurityConfig`, so they are effectively open on the service port.

**Asynchronous — Kafka.** Topics in use:

| Topic | Producer → Consumer |
|---|---|
| `image.upload` / `image.uploaded` / `image.delete` (constants in `shared-contacts` `ImageTopics`) | post/profile/group → file-service, and back |
| `post.events` | post-service → interaction-service (cascade-deletes comments/likes on `DELETED`) |
| `like.events`, `comment.events` | interaction-service → notification-service |
| `notification.events`, `notification-delivery` | notification-service / identity-service |

### The image upload flow (non-obvious)

file-service is the only module that talks to Cloudinary; nobody uploads directly. Instead each service's `ImageUploadKafkaService` implements **synchronous request/response over Kafka**: it base64-encodes the `MultipartFile` (`shared-common` `MediaConverter`), puts a random `correlationId` in the **Kafka message key**, registers a `CompletableFuture` in a local `ConcurrentHashMap`, sends `image.upload`, and **blocks up to 30s** on the future. file-service's `ImageUploadListener` uploads and echoes back on `image.uploaded` with the same key; the `@KafkaListener` in the calling service completes the future.

This means: image bytes travel through Kafka as base64 (watch the multipart size limits in each service's config), and the pending-future map is **per-instance in-memory**, so any of these services replying to a request they didn't originate will drop it — the pattern does not survive horizontal scaling.

## Deliberate duplication

`ApiResponse`, `PageResponse`, `AppException`, `ErrorCode`, `GlobalExceptionHandler`, `CustomJwtDecoder`, `SecurityConfig`, `JwtAuthenticationEntryPoint`, `AuthenticationRequestInterceptor`, and the DTOs mirroring other services' responses are **copy-pasted into every service** rather than shared. Only `shared-common` (one class: `MediaConverter`) and `shared-contacts` (image event contracts) are shared, and adding to them forces a `mvn install` + rebuild of every dependent service.

Follow the existing per-service copies when adding code. A fix to `ErrorCode` or `GlobalExceptionHandler` in one service does **not** propagate — if a bug is in a duplicated class, check whether it needs fixing in the other ten too, and say so rather than silently patching one.

Standard service anatomy: `controller/` (thin, returns `ApiResponse<T>`) → `service/` (all logic, resolves current user, calls Feign clients) → `repository/` (+ `repository/httpclient/` for Feign) → `entity/`, with `dto/request`, `dto/response`, MapStruct `mapper/`, and Lombok `@FieldDefaults(level = PRIVATE, makeFinal = true)` + `@RequiredArgsConstructor` for injection throughout.

## Other notes

- chat-service uses STOMP over WebSocket (`WebSocketConfig`, `WebSocketAuthInterceptor` pulls the JWT off the CONNECT frame) alongside its REST controllers.
- Credentials are hardcoded in the config-server YAMLs (MySQL root password, MongoDB root password). They're already committed; don't propagate them into new files, and don't "fix" them without asking.
- Swagger per service at `http://localhost:<port><context-path>/swagger-ui.html`.
