# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ChillNet** — a social network built as 11 Spring Boot microservices (Java 17, Spring Boot 3.5.5, Spring Cloud 2025.0.0) plus one **Python/FastAPI** service (`ai-service`, content moderation) plus two shared library modules. It is a polyglot stack: the 11 Java services share the Maven build/run flow; `ai-service` is a separate Python app (uvicorn). Educational/capstone project; the README is in Vietnamese, and much of the code's comments and user-facing error messages are Vietnamese too — match that when editing existing files.

## Build & run

**There is no root aggregator POM.** Every directory is an independent Maven project inheriting directly from `spring-boot-starter-parent`. `mvn` at the repo root does nothing — always `cd` into a service first.

The two shared modules are consumed as normal `com.tien:*:0.0.1-SNAPSHOT` dependencies from the local `~/.m2` repository, so they must be installed before any service that depends on them will build. The easy path:

```bash
docker compose -f docker-compose.infra.yml up -d   # MySQL 3306 + MongoDB host-port 27018 + MinIO 9000/9001, RAM-capped
scripts/run-minio.sh                               # only if infra runs as local binaries — see below
scripts/build-all.sh                               # installs shared libs, packages 11 services
export JWT_SIGNER_KEY=<secret> && scripts/run-all.sh   # runs everything with capped heaps (~3GB total)
scripts/stop-all.sh
```

Startup order (run-all.sh handles it): **identity-service (8081) → everything else**. There is no config-server anymore.

**This dev machine has no docker.** Use `scripts/start-all.sh` to start MySQL, MongoDB and MinIO from `.runtime/bin`, then launch every backend/AI service and the frontend. Data lives in `.runtime-data/`, logs/PIDs in `logs/`; `scripts/stop-all.sh` stops the whole local stack. `docker-compose.infra.yml` remains the alternative for machines that do have docker; both paths use the same ports and credentials, so `file-service`'s yaml defaults work either way.

| Command | Where |
|---|---|
| `./mvnw spring-boot:run` | any service dir (dev; costs 2 JVMs/service — prefer `java -jar target/*.jar`) |
| `./mvnw test` | any service dir |
| `./mvnw test -Dtest=PostServiceApplicationTests` | single test |
| `./mvnw spotless:apply` | any service except gateway/shared-* |

Tests are only the generated `contextLoads` smoke tests — there is no real test suite. A "test" run therefore requires the infrastructure to be up, and passing tests proves very little.

Spotless (palantir-java-format, tabs=4 spaces, import order `java,jakarta,org,com,com.diffplug`) is configured but **not bound to a build phase** — it never runs automatically. Run `spotless:apply` manually before committing Java changes.

Env vars: `JWT_SIGNER_KEY` (identity, **required — no default**). Optional (dummy/empty defaults exist so services still boot; the feature just doesn't work): `CLIENT_ID`/`CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` (identity Google OAuth2), `MINIO_ENDPOINT`/`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`/`MINIO_BUCKET`/`MINIO_PUBLIC_URL` (file-service object storage — the yaml defaults already match `docker-compose.infra.yml`, so local dev needs none of them), `BREVO_APIKEY` (notification email), `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL` (ai-service moderation — blank key means moderation is skipped/fail-open).

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
| ai-service | 8090 | `/ai` | — (**Python/FastAPI**, stateless; calls an OpenAI-compatible LLM) |
| moderation-service | 8091 | `/moderation` | MySQL `moderation_service` |

MySQL schemas for profile/social are **not** auto-created (no `createDatabaseIfNotExist`) — `scripts/mysql-init/01-create-databases.sql` pre-creates all five via the compose file.

External clients call `http://localhost:8080/api/v1/<service>/**`; the gateway `StripPrefix=2` filter removes `/api/v1/<service>` and the target service's `context-path` puts it back. So a controller mapped `@GetMapping("/posts")` in post-service is reached at `/api/v1/post/posts`. The one exception is `profile_service_internal` (`/profile/internal/**`, StripPrefix=1).

Java packages don't match directory names: `post-service/` → `com.tien.postservice`, `shared-contacts/` → `com.tien.sharedcontacts`.

## Auth model

identity-service is the only issuer and the only verifier. `JwtService` signs HS512 with `jwt.signerKey`, sets **`subject` = the user's ID** (not username) and a space-delimited `scope` claim of `ROLE_*` + permissions. Revocation is a DB table of invalidated JWT IDs. The gateway's `AuthenticationFilter` calls identity's `/auth/introspect` for every non-public request — it is the only edge-side check.

`JwtService.verifyToken` also calls `AccountModerationService.assertUsable(subject)`, so a `SUSPENDED`/`BANNED` account loses every open session at the next request instead of waiting for its token to expire. That costs one `SELECT` per introspect, i.e. per gateway request. An expired suspension is lifted lazily there (and at login) rather than by a scheduled job. `User.status` is separate from `isActive`, which still means "email verified".

Every downstream service has its own copy of `CustomJwtDecoder` that **only parses the token and never checks the signature or the revocation list** — it trusts anything well-formed. Downstream trust therefore rests entirely on requests arriving via the gateway. Keep this in mind before assuming a service-level check is enforcing anything; it isn't a bug to fix casually, but don't add security assumptions on top of it.

Consequences for writing code in any non-identity service:
- Current user ID = `SecurityContextHolder.getContext().getAuthentication().getName()` (services wrap this in a private `getCurrentUserId()`).
- `JwtGrantedAuthoritiesConverter` runs with an **empty authority prefix**, so `@PreAuthorize` checks use the raw `ROLE_ADMIN` string.
- Each `SecurityConfig` permits `/internal/**` and the Swagger paths, and authenticates everything else.

## Cross-service communication

**All synchronous — OpenFeign.** There is no message broker. Clients live in `repository/httpclient/`, are declared with a hardcoded `url = "${app.services.<x>.url}"` (**no service discovery / Eureka**, no load balancing), and use each service's `FeignConfig` + `AuthenticationRequestInterceptor`, which copies the caller's `Authorization` header onto the outbound call. Feign targets always hit the callee's port directly, bypassing the gateway. identity-service's interceptor copy is null-safe (skips the header when there is no request context, e.g. `@Async` threads) — the other copies are not.

Endpoints intended for service-to-service use go in an `InternalPostController`-style class under `@RequestMapping("/internal")` — unauthenticated by `SecurityConfig`, so they are effectively open on the service port.

Four flows worth knowing:
- **Image upload**: file-service is the only module that talks to object storage (**MinIO**, S3-compatible — it replaced Cloudinary). `ObjectStorageService` is the only class touching the MinIO SDK; it creates the bucket and sets a public-read policy at startup so the `secure_url` stored in MongoDB stays valid forever (presigned URLs would expire and kill every old image). MinIO has no on-the-fly transformations, so all four `ImageVersions` variants point at the same original file — nothing reads them anyway. post/profile/group each have an `ImageUploadService` that base64-encodes the `MultipartFile` (`shared-common` `MediaConverter`) into an `ImageUploadEvent` (`shared-contacts`) and POSTs it via `FileClient` to file-service `/images/upload`, getting an `ImageUploadedEvent` back. The caller's JWT is forwarded, so this only works inside an authenticated request.
- **Notifications/email**: identity-service's `NotificationService` is `@Async` fire-and-forget — it POSTs a `NotificationEvent` to notification-service `/internal/notifications/send` (`InternalNotificationController`), which sends email via Brevo and saves an in-app Notification when `param.userId` is present. Errors are swallowed on both sides so registration/OTP flows never fail because of email.
- **Content moderation**: post-service `createPost` and interaction-service `createComment` call `ai-service` `POST /internal/moderations/moderate` (via `AiClient` Feign, JWT forwarded) before saving. `ai-service` asks an OpenAI-compatible LLM (`OPENAI_BASE_URL`/`OPENAI_MODEL`) to classify the text and returns `{flagged, severity, categories, reason}`. Callers **fail open** — if the AI call throws or the key is blank they allow the content; they only reject (`CONTENT_VIOLATION`) when `severity == HIGH`. `ai-service` itself is stateless (no DB) and also fails open internally. Note `ai-service` is **Python/FastAPI**, not Spring: `build-all.sh` sets up its `.venv` + `pip install`, `run-all.sh` starts it with `uvicorn` (not `java -jar`), and its `OPENAI_*` env comes from the root `.env`. Env config is loaded by `run-all.sh`/`build-all.sh` sourcing the root `.env` (git-ignored; `.env.example` is the template) — **optional vars there must be commented out, not left empty**, or an empty `CLIENT_ID=` overrides the yaml default and identity-service dies on Google OAuth2 startup.
- **Reporting & human moderation**: `moderation-service` owns the whole Trust & Safety loop — user report → `ModerationCase` → decision → enforcement → appeal → `AuditLog` — and is the only service allowed to change another service's content/account state. Distinct from the `ai-service` flow above: AI screening happens *before* publishing and fails open; this one happens *after*, is driven by humans (`ROLE_ADMIN`), and **fails closed** (`ENFORCEMENT_FAILED`) so a case is never marked `ACTIONED` while the content is still visible. Reports on the same target are merged into one open case (`reportCount`, severity escalates at 5 reports). Enforcement goes out over Feign to `post-service` / `interaction-service` `/internal/{posts,comments}/{id}/moderation` (sets a `ModerationStatus`; nothing is deleted, so an upheld appeal can restore it) and to `identity-service` `/internal/users/{id}/status`. Those write endpoints carry `@PreAuthorize("hasRole('ADMIN')")` — `/internal/**` is `permitAll` but the JWT is still decoded, and moderation-service forwards the moderator's token. The paired `/owner` lookups are *not* admin-gated because ordinary users hit them when filing a report. `moderation-service` never reads another service's database. Note the asymmetry a suspension creates: once `assertUsable` rejects a user, **every** gateway request from them 401s, including `POST /moderation/appeals` — so a suspended or banned account cannot appeal. `POST /cases/{id}/revert` (admin, `ACTIONED` cases only) exists for exactly that reason; without it a wrong ban would be unfixable through the API.

## Deliberate duplication

`ApiResponse`, `PageResponse`, `AppException`, `ErrorCode`, `GlobalExceptionHandler`, `CustomJwtDecoder`, `SecurityConfig`, `JwtAuthenticationEntryPoint`, `AuthenticationRequestInterceptor`, and the DTOs mirroring other services' responses are **copy-pasted into every service** rather than shared. Only `shared-common` (one class: `MediaConverter`) and `shared-contacts` (image DTO contracts) are shared, and adding to them forces a `mvn install` + rebuild of every dependent service.

Follow the existing per-service copies when adding code. A fix to `ErrorCode` or `GlobalExceptionHandler` in one service does **not** propagate — if a bug is in a duplicated class, check whether it needs fixing in the other nine too, and say so rather than silently patching one.

Standard service anatomy: `controller/` (thin, returns `ApiResponse<T>`) → `service/` (all logic, resolves current user, calls Feign clients) → `repository/` (+ `repository/httpclient/` for Feign) → `entity/`, with `dto/request`, `dto/response`, MapStruct `mapper/`, and Lombok `@FieldDefaults(level = PRIVATE, makeFinal = true)` + `@RequiredArgsConstructor` for injection throughout.

## Other notes

- chat-service uses STOMP over WebSocket (`WebSocketConfig`, `WebSocketAuthInterceptor` pulls the JWT off the CONNECT frame) alongside its REST controllers.
- `ModerationStatus` is enforced at *read* time, not by deleting rows: post-service filters in `PostService` (`isDistributable` for feed/explore/search/group, `isViewableBy` for profile/saved/detail — the owner keeps seeing their own hidden post), interaction-service filters in the `findVisible*` JPQL queries. A **null status means VISIBLE** so pre-existing posts/comments still show. If you add a new read path in either service, it will leak moderated content unless you apply the same filter.
- moderation-service now has a frontend: `features/moderation/` (report modal wired into `PostCard`/`CommentItem`, plus `/my-reports` with reports / cases-against-me / appeals) and `features/admin/` (`/admin/moderation` queue + case detail, `/admin/appeals`). `AdminRoute` only hides the UI — every admin endpoint still carries its own `@PreAuthorize`. Enum labels live in one place, `features/moderation/constants.js`; the community policy page renders from that same list, so adding a `ReportReason` must start there.
- The gateway rate-limits by IP + endpoint group (`RateLimitFilter`, order -1 so it runs before auth). Counters are in-memory, so a second gateway replica would count separately — move them to Redis before scaling out. Login is 5/min: any script that logs several accounts in must pace itself (see `scripts/seed-demo.py`).
- `scripts/seed-demo.py` fills a demo dataset (users, posts, friendships, a live moderation queue). It reads registration OTPs by briefly restarting identity-service with `logging.level.org.hibernate.orm.jdbc.bind=TRACE`, so **`logs/identity-service.log` may contain OTP codes** after a seed run — clear `logs/` before sharing the repo.
- Every service exposes `/actuator/health` and `/actuator/info` only (no `env`/`loggers`), permitted in each `SecurityConfig`. identity-service needed a separate matcher because its `PUBLIC_ENDPOINTS` are POST-only.
- Credentials live in each service's `application.yaml` as `${ENV:default}` defaults (MySQL/Mongo root password). They're already committed; don't propagate them into new files, and don't "fix" them without asking.
- Swagger per service at `http://localhost:<port><context-path>/swagger-ui.html`.
