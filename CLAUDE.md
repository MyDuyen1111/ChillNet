# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ChillNet** — a social network built as 10 Spring Boot microservices (Java 17, Spring Boot 3.5.5, Spring Cloud 2025.0.0) plus two shared library modules. Educational/capstone project; the README is in Vietnamese, and much of the code's comments and user-facing error messages are Vietnamese too — match that when editing existing files.

## Build & run

**There is no root aggregator POM.** Every directory is an independent Maven project inheriting directly from `spring-boot-starter-parent`. `mvn` at the repo root does nothing — always `cd` into a service first.

The two shared modules are consumed as normal `com.tien:*:0.0.1-SNAPSHOT` dependencies from the local `~/.m2` repository, so they must be installed before any service that depends on them will build. The easy path:

```bash
docker compose -f docker-compose.infra.yml up -d   # MySQL 3306 + MongoDB host-port 27018, RAM-capped
scripts/build-all.sh                               # installs shared libs, packages 10 services
export JWT_SIGNER_KEY=<secret> && scripts/run-all.sh   # runs everything with capped heaps (~3GB total)
scripts/stop-all.sh
```

Startup order (run-all.sh handles it): **identity-service (8081) → everything else**. There is no config-server anymore.

| Command | Where |
|---|---|
| `./mvnw spring-boot:run` | any service dir (dev; costs 2 JVMs/service — prefer `java -jar target/*.jar`) |
| `./mvnw test` | any service dir |
| `./mvnw test -Dtest=PostServiceApplicationTests` | single test |
| `./mvnw spotless:apply` | any service except gateway/shared-* |

Tests are only the generated `contextLoads` smoke tests — there is no real test suite. A "test" run therefore requires the infrastructure to be up, and passing tests proves very little.

Spotless (palantir-java-format, tabs=4 spaces, import order `java,jakarta,org,com,com.diffplug`) is configured but **not bound to a build phase** — it never runs automatically. Run `spotless:apply` manually before committing Java changes.

Env vars: `JWT_SIGNER_KEY` (identity, **required — no default**). Optional (dummy/empty defaults exist so services still boot; the feature just doesn't work): `CLIENT_ID`/`CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` (identity Google OAuth2), `CLOUD_NAME`/`API_KEY`/`API_SECRET` (file-service Cloudinary), `BREVO_APIKEY` (notification email).

## Configuration is static, per service

Each service's full config lives in its own `src/main/resources/application.yaml` (ports, context paths, datasource URIs, Feign target URLs). Credentials follow the `${ENV_VAR:default}` pattern with the local-dev value as default. There is **no Spring Cloud Config** — change a service's yaml, rebuild that service, done.

## Service map

| Service | Port | Context path | Store |
|---|---|---|---|
| api-gateway | 8080 | — | — |
| identity-service | 8081 | `/identity` | MySQL `identity_service` |
| profile-service | 8082 | `/profile` | MySQL `profile_service` |
| notification-service | 8083 | `/notification` | MongoDB |
| post-service | 8084 | `/post` | MongoDB |
| file-service | 8085 | `/file` | MongoDB |
| chat-service | 8086 | `/chat` | MongoDB |
| social-service | 8087 | `/social` | MySQL `social_service` |
| interaction-service | 8088 | `/interaction` | MySQL `interaction_service` |
| group-service | 8089 | `/group` | MongoDB |

MySQL schemas for profile/social are **not** auto-created (no `createDatabaseIfNotExist`) — `scripts/mysql-init/01-create-databases.sql` pre-creates all four via the compose file.

External clients call `http://localhost:8080/api/v1/<service>/**`; the gateway `StripPrefix=2` filter removes `/api/v1/<service>` and the target service's `context-path` puts it back. So a controller mapped `@GetMapping("/posts")` in post-service is reached at `/api/v1/post/posts`. The one exception is `profile_service_internal` (`/profile/internal/**`, StripPrefix=1).

Java packages don't match directory names: `post-service/` → `com.tien.postservice`, `shared-contacts/` → `com.tien.sharedcontacts`.

## Auth model

identity-service is the only issuer and the only verifier. `JwtService` signs HS512 with `jwt.signerKey`, sets **`subject` = the user's ID** (not username) and a space-delimited `scope` claim of `ROLE_*` + permissions. Revocation is a DB table of invalidated JWT IDs. The gateway's `AuthenticationFilter` calls identity's `/auth/introspect` for every non-public request — it is the only edge-side check.

Every downstream service has its own copy of `CustomJwtDecoder` that **only parses the token and never checks the signature or the revocation list** — it trusts anything well-formed. Downstream trust therefore rests entirely on requests arriving via the gateway. Keep this in mind before assuming a service-level check is enforcing anything; it isn't a bug to fix casually, but don't add security assumptions on top of it.

Consequences for writing code in any non-identity service:
- Current user ID = `SecurityContextHolder.getContext().getAuthentication().getName()` (services wrap this in a private `getCurrentUserId()`).
- `JwtGrantedAuthoritiesConverter` runs with an **empty authority prefix**, so `@PreAuthorize` checks use the raw `ROLE_ADMIN` string.
- Each `SecurityConfig` permits `/internal/**` and the Swagger paths, and authenticates everything else.

## Cross-service communication

**All synchronous — OpenFeign.** There is no message broker. Clients live in `repository/httpclient/`, are declared with a hardcoded `url = "${app.services.<x>.url}"` (**no service discovery / Eureka**, no load balancing), and use each service's `FeignConfig` + `AuthenticationRequestInterceptor`, which copies the caller's `Authorization` header onto the outbound call. Feign targets always hit the callee's port directly, bypassing the gateway. identity-service's interceptor copy is null-safe (skips the header when there is no request context, e.g. `@Async` threads) — the other copies are not.

Endpoints intended for service-to-service use go in an `InternalPostController`-style class under `@RequestMapping("/internal")` — unauthenticated by `SecurityConfig`, so they are effectively open on the service port.

Two flows worth knowing:
- **Image upload**: file-service is the only module that talks to Cloudinary. post/profile/group each have an `ImageUploadService` that base64-encodes the `MultipartFile` (`shared-common` `MediaConverter`) into an `ImageUploadEvent` (`shared-contacts`) and POSTs it via `FileClient` to file-service `/images/upload`, getting an `ImageUploadedEvent` back. The caller's JWT is forwarded, so this only works inside an authenticated request.
- **Notifications/email**: identity-service's `NotificationService` is `@Async` fire-and-forget — it POSTs a `NotificationEvent` to notification-service `/internal/notifications/send` (`InternalNotificationController`), which sends email via Brevo and saves an in-app Notification when `param.userId` is present. Errors are swallowed on both sides so registration/OTP flows never fail because of email.

## Deliberate duplication

`ApiResponse`, `PageResponse`, `AppException`, `ErrorCode`, `GlobalExceptionHandler`, `CustomJwtDecoder`, `SecurityConfig`, `JwtAuthenticationEntryPoint`, `AuthenticationRequestInterceptor`, and the DTOs mirroring other services' responses are **copy-pasted into every service** rather than shared. Only `shared-common` (one class: `MediaConverter`) and `shared-contacts` (image DTO contracts) are shared, and adding to them forces a `mvn install` + rebuild of every dependent service.

Follow the existing per-service copies when adding code. A fix to `ErrorCode` or `GlobalExceptionHandler` in one service does **not** propagate — if a bug is in a duplicated class, check whether it needs fixing in the other nine too, and say so rather than silently patching one.

Standard service anatomy: `controller/` (thin, returns `ApiResponse<T>`) → `service/` (all logic, resolves current user, calls Feign clients) → `repository/` (+ `repository/httpclient/` for Feign) → `entity/`, with `dto/request`, `dto/response`, MapStruct `mapper/`, and Lombok `@FieldDefaults(level = PRIVATE, makeFinal = true)` + `@RequiredArgsConstructor` for injection throughout.

## Other notes

- chat-service uses STOMP over WebSocket (`WebSocketConfig`, `WebSocketAuthInterceptor` pulls the JWT off the CONNECT frame) alongside its REST controllers.
- Credentials live in each service's `application.yaml` as `${ENV:default}` defaults (MySQL/Mongo root password). They're already committed; don't propagate them into new files, and don't "fix" them without asking.
- Swagger per service at `http://localhost:<port><context-path>/swagger-ui.html`.
