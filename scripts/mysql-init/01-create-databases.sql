-- Tạo sẵn 4 schema MySQL cho các service dùng JPA.
-- (profile_service và social_service KHÔNG có createDatabaseIfNotExist trong JDBC URL
--  nên bắt buộc phải tồn tại trước khi service khởi động.)
CREATE DATABASE IF NOT EXISTS identity_service;
CREATE DATABASE IF NOT EXISTS profile_service;
CREATE DATABASE IF NOT EXISTS social_service;
CREATE DATABASE IF NOT EXISTS interaction_service;
