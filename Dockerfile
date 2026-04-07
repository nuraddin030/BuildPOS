# ================================
# Stage 1: Build (Maven)
# ================================
FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Avval faqat pom.xml — dependency cache uchun
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Backend kodi (src/ repo ildizida)
COPY src ./src

RUN mvn clean package -DskipTests -q

# ================================
# Stage 2: Runtime
# ================================
FROM eclipse-temurin:17-jre-alpine

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# Upload papkasi
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", \
  "-Xmx512m", \
  "-XX:+UseG1GC", \
  "-Dspring.profiles.active=prod", \
  "-jar", "app.jar"]
