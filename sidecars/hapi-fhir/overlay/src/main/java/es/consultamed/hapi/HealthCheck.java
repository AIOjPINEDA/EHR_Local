package es.consultamed.hapi;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public final class HealthCheck {

    private static final String READINESS_URL = "http://127.0.0.1:8080/actuator/health/readiness";
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private HealthCheck() {
    }

    public static void main(String[] args) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
        HttpRequest request = HttpRequest.newBuilder(URI.create(READINESS_URL)).timeout(TIMEOUT).GET().build();

        try {
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 && response.body().contains("\"status\":\"UP\"")) {
                return;
            }

            System.err.printf(
                "HAPI readiness check failed: status=%d body=%s%n",
                response.statusCode(),
                response.body()
            );
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            System.err.printf("HAPI readiness check failed: %s%n", exception.getMessage());
        }

        System.exit(1);
    }
}