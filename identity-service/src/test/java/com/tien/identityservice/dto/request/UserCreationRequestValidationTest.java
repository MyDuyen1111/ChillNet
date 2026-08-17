package com.tien.identityservice.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class UserCreationRequestValidationTest {
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void rejectsBlankNamesAndEmailWithoutDot() {
        var request =
                validRequest().firstName(" ").lastName("").email("user@example").build();

        Set<String> messages = messagesFor(request);

        assertThat(messages).contains("FIRST_NAME_REQUIRED", "LAST_NAME_REQUIRED", "INVALID_EMAIL");
    }

    @Test
    void rejectsPasswordsMissingAnyRequiredCharacterType() {
        assertThat(messagesFor(validRequest().password("Abcdefg1").build())).contains("INVALID_PASSWORD");
        assertThat(messagesFor(validRequest().password("abcdef1!").build())).contains("INVALID_PASSWORD");
        assertThat(messagesFor(validRequest().password("ABCDEF1!").build())).contains("INVALID_PASSWORD");
        assertThat(messagesFor(validRequest().password("Abcdefg!").build())).contains("INVALID_PASSWORD");
        assertThat(messagesFor(validRequest().password("Ab1!").build())).contains("INVALID_PASSWORD");
    }

    @Test
    void acceptsACompleteRegistrationRequest() {
        assertThat(messagesFor(validRequest().build())).isEmpty();
    }

    private static UserCreationRequest.UserCreationRequestBuilder validRequest() {
        return UserCreationRequest.builder()
                .firstName("Nguyen")
                .lastName("An")
                .username("nguyenan")
                .email("an@example.com")
                .password("ChillNet1!");
    }

    private static Set<String> messagesFor(UserCreationRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }
}
