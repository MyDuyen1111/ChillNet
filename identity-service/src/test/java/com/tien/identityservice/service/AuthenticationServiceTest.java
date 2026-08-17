package com.tien.identityservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tien.identityservice.dto.request.AuthenticationRequest;
import com.tien.identityservice.dto.request.UserCreationRequest;
import com.tien.identityservice.entity.User;
import com.tien.identityservice.exception.AppException;
import com.tien.identityservice.exception.ErrorCode;
import com.tien.identityservice.mapper.UserMapper;
import com.tien.identityservice.repository.RoleRepository;
import com.tien.identityservice.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
    @Mock
    UserRepository userRepository;

    @Mock
    UserMapper userMapper;

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    RoleRepository roleRepository;

    @Mock
    JwtService jwtService;

    @Mock
    OtpService otpService;

    @Mock
    NotificationService notificationService;

    @Mock
    ProfileService profileService;

    @Mock
    AccountModerationService accountModerationService;

    @InjectMocks
    AuthenticationService authenticationService;

    @Test
    void reportsDuplicateUsernameDuringRegistration() {
        var request = registrationRequest("existing", "new@example.com");
        when(userRepository.existsByUsername("existing")).thenReturn(true);

        assertThatThrownBy(() -> authenticationService.register(request))
                .isInstanceOfSatisfying(AppException.class, exception -> assertThat(exception.getErrorCode())
                        .isEqualTo(ErrorCode.USER_EXISTED));
    }

    @Test
    void reportsDuplicateEmailDuringRegistrationIgnoringCaseAndWhitespace() {
        var request = registrationRequest("new-user", " Existing@Example.com ");
        when(userRepository.existsByUsername("new-user")).thenReturn(false);
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authenticationService.register(request))
                .isInstanceOfSatisfying(AppException.class, exception -> assertThat(exception.getErrorCode())
                        .isEqualTo(ErrorCode.EMAIL_EXISTED));
    }

    @Test
    void reportsUnverifiedEmailInsteadOfDisabledAccount() {
        User user = user(false, false);
        when(userRepository.findByUsernameWithRolesAndPermissions("pending")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "encoded")).thenReturn(true);

        assertThatThrownBy(() -> authenticationService.authenticate(loginRequest("pending")))
                .isInstanceOfSatisfying(AppException.class, exception -> assertThat(exception.getErrorCode())
                        .isEqualTo(ErrorCode.EMAIL_NOT_VERIFIED));
    }

    @Test
    void keepsDisabledErrorForADeactivatedVerifiedAccount() {
        User user = user(false, true);
        when(userRepository.findByUsernameWithRolesAndPermissions("pending")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "encoded")).thenReturn(true);

        assertThatThrownBy(() -> authenticationService.authenticate(loginRequest("pending")))
                .isInstanceOfSatisfying(AppException.class, exception -> assertThat(exception.getErrorCode())
                        .isEqualTo(ErrorCode.USER_DISABLED));
    }

    @Test
    void acceptsEmailAsLoginIdentifierIgnoringCase() {
        User user = user(true, true);
        when(userRepository.findByEmailWithRolesAndPermissions("pending@example.com"))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password1!", "encoded")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("token");

        var response = authenticationService.authenticate(loginRequest(" Pending@Example.com "));

        assertThat(response.getToken()).isEqualTo("token");
        assertThat(response.isAuthenticated()).isTrue();
    }

    private AuthenticationRequest loginRequest(String username) {
        return AuthenticationRequest.builder()
                .username(username)
                .password("Password1!")
                .build();
    }

    private UserCreationRequest registrationRequest(String username, String email) {
        return UserCreationRequest.builder()
                .username(username)
                .email(email)
                .password("Password1!")
                .firstName("New")
                .lastName("User")
                .build();
    }

    private User user(boolean active, boolean emailVerified) {
        return User.builder()
                .username("pending")
                .password("encoded")
                .email("pending@example.com")
                .emailVerified(emailVerified)
                .isActive(active)
                .build();
    }
}
