FROM maven:3.9.9-eclipse-temurin-17 AS overlay-build

WORKDIR /build

COPY overlay/pom.xml overlay/pom.xml
COPY overlay/src overlay/src

RUN mvn -f overlay/pom.xml -DskipTests package
RUN mkdir -p /build/runtime-data

# `latest` currently resolves to the `v8.8.0-1` starter image; pin the real,
# resolvable tag explicitly so local builds stay reproducible.
FROM hapiproject/hapi:v8.8.0-1

COPY --from=overlay-build /build/overlay/target/consultamed-hapi-overlay-0.1.0.jar /app/extra-classes/consultamed-hapi-overlay.jar
COPY --from=overlay-build --chown=65532:65532 /build/runtime-data/ /data/
COPY consultamed.application.yaml /app/config/consultamed.application.yaml

USER 65532:65532