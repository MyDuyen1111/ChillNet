package com.tien.identityservice.configuration;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tien.identityservice.constant.PredefinedRole;
import com.tien.identityservice.constant.SignInProvider;
import com.tien.identityservice.dto.request.ProfileCreationRequest;
import com.tien.identityservice.entity.Role;
import com.tien.identityservice.entity.User;
import com.tien.identityservice.repository.RoleRepository;
import com.tien.identityservice.repository.UserRepository;
import com.tien.identityservice.service.ProfileService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * ApplicationInitConfig: Cấu hình khởi tạo dữ liệu mặc định khi ứng dụng khởi động.
 * - Tự động tạo các role mặc định (USER, ADMIN) nếu chưa tồn tại
 * - Tự động tạo tài khoản admin mặc định từ cấu hình (app.seed.admin.*)
 * - Chỉ chạy khi sử dụng MySQL (ConditionalOnProperty)
 */
@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class ApplicationInitConfig {

    /** ~2 phút tổng cộng: đủ cho profile-service khởi động sau identity-service. */
    private static final int PROFILE_SEED_MAX_ATTEMPTS = 40;

    private static final long PROFILE_SEED_RETRY_DELAY_MS = 3000L;

    final PasswordEncoder passwordEncoder;

    final ProfileService profileService;

    @Value("${app.seed.admin.username}")
    protected String adminUsername;

    @Value("${app.seed.admin.password}")
    protected String adminPassword;

    @Value("${app.seed.admin.email}")
    protected String adminEmail;

    @Bean
    @ConditionalOnProperty(
            prefix = "spring",
            value = "datasource.driver-class-name",
            havingValue = "com.mysql.cj.jdbc.Driver")
    ApplicationRunner applicationRunner(UserRepository userRepository, RoleRepository roleRepository) {
        return args -> {
            log.info("[INIT] Starting default data initialization...");

            // 1) Ensure roles
            Role userRole = roleRepository
                    .findByName(PredefinedRole.USER_ROLE)
                    .orElseGet(() -> roleRepository.save(Role.builder()
                            .name(PredefinedRole.USER_ROLE)
                            .description("User role")
                            .build()));

            Role adminRole = roleRepository
                    .findByName(PredefinedRole.ADMIN_ROLE)
                    .orElseGet(() -> roleRepository.save(Role.builder()
                            .name(PredefinedRole.ADMIN_ROLE)
                            .description("Admin role")
                            .build()));

            // 2) Ensure admin user
            User admin = userRepository
                    .findByUsername(adminUsername)
                    .or(() -> userRepository.findByEmail(adminEmail))
                    .orElse(null);

            if (admin == null) {
                Set<Role> roles = new HashSet<>();
                roles.add(adminRole);
                // roles.add(userRole); // mở nếu muốn admin có cả USER

                LocalDateTime now = LocalDateTime.now();

                admin = userRepository.save(User.builder()
                        .username(adminUsername)
                        .password(passwordEncoder.encode(adminPassword))
                        .email(adminEmail)
                        .emailVerified(true)
                        .isActive(true)
                        .provider(SignInProvider.LOCAL)
                        .roles(roles)
                        .createdAt(now)
                        .updatedAt(now)
                        .build());

                log.warn(
                        "[INIT] Admin '{}' created with default password '{}'. Please change it ASAP.",
                        adminUsername,
                        adminPassword);
            } else {
                log.info("[INIT] Admin '{}' already exists. Skipping user seed.", adminUsername);
            }

            // 3) Ensure admin profile.
            // Chạy cả khi admin đã tồn tại: các bản seed trước không tạo profile, nên tài khoản
            // admin cũ vẫn đăng nhập được nhưng /users/my-profile ném USER_NOT_EXISTED và toàn bộ
            // giao diện phải fallback về "Người dùng". Đây là chỗ vá cho những tài khoản đó.
            profileService.createProfileWithRetry(
                    ProfileCreationRequest.builder()
                            .userId(admin.getId())
                            .username(adminUsername)
                            .email(adminEmail)
                            // Luồng đăng ký cũng lấy username làm lastName khi không có tên thật,
                            // giữ giống vậy để displayName() phía web hiển thị nhất quán.
                            .lastName(adminUsername)
                            .build(),
                    PROFILE_SEED_MAX_ATTEMPTS,
                    PROFILE_SEED_RETRY_DELAY_MS);

            log.info("[INIT] Default data initialization completed.");
        };
    }
}
