package es.consultamed.hapi;

import java.util.UUID;

import org.hl7.fhir.instance.model.api.IIdType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ca.uhn.fhir.interceptor.api.Hook;
import ca.uhn.fhir.interceptor.api.Interceptor;
import ca.uhn.fhir.interceptor.api.Pointcut;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.server.exceptions.BaseServerResponseException;

@Interceptor
public class AuditTrailInterceptor {

    private static final Logger AUDIT_LOG = LoggerFactory.getLogger("consultamed.hapi.audit");
    private static final String ETL_API_KEY_HEADER = "X-Consultamed-ETL-Key";
    private static final String START_TIME_KEY = AuditTrailInterceptor.class.getName() + ".startTime";
    private static final String FAILURE_LOGGED_KEY = AuditTrailInterceptor.class.getName() + ".failureLogged";

    @Hook(Pointcut.SERVER_INCOMING_REQUEST_PRE_HANDLED)
    public void markRequestStart(RequestDetails requestDetails) {
        if (requestDetails.isSubRequest()) {
            return;
        }

        if (isBlank(requestDetails.getRequestId())) {
            requestDetails.setRequestId(UUID.randomUUID().toString());
        }

        requestDetails.getUserData().put(START_TIME_KEY, System.currentTimeMillis());
    }

    @Hook(Pointcut.SERVER_OUTGOING_RESPONSE)
    public void logSuccess(RequestDetails requestDetails) {
        if (requestDetails.isSubRequest()) {
            return;
        }

        if (Boolean.TRUE.equals(requestDetails.getUserData().get(FAILURE_LOGGED_KEY))) {
            return;
        }

        AUDIT_LOG.info(
            "requestId={} outcome=success method={} interaction={} resourceType={} resourceId={} internalWrite={} durationMs={}",
            safe(requestDetails.getRequestId()),
            safe(requestMethod(requestDetails)),
            safe(interaction(requestDetails)),
            safe(requestDetails.getResourceName()),
            safe(resourceId(requestDetails)),
            Boolean.toString(isInternalWrite(requestDetails)),
            Long.toString(durationMillis(requestDetails))
        );
    }

    @Hook(Pointcut.SERVER_HANDLE_EXCEPTION)
    public void logFailure(
        RequestDetails requestDetails,
        BaseServerResponseException exception
    ) {
        if (requestDetails.isSubRequest()) {
            return;
        }

        requestDetails.getUserData().put(FAILURE_LOGGED_KEY, Boolean.TRUE);

        AUDIT_LOG.warn(
            "requestId={} outcome=failure method={} interaction={} resourceType={} resourceId={} internalWrite={} durationMs={} status={} error={}",
            safe(requestDetails.getRequestId()),
            safe(requestMethod(requestDetails)),
            safe(interaction(requestDetails)),
            safe(requestDetails.getResourceName()),
            safe(resourceId(requestDetails)),
            Boolean.toString(isInternalWrite(requestDetails)),
            Long.toString(durationMillis(requestDetails)),
            Integer.toString(exception.getStatusCode()),
            safe(exception.getClass().getSimpleName())
        );
    }

    private String requestMethod(RequestDetails requestDetails) {
        if (requestDetails.getRequestType() == null) {
            return "-";
        }

        return requestDetails.getRequestType().name();
    }

    private String interaction(RequestDetails requestDetails) {
        if (requestDetails.getRestOperationType() != null) {
            return requestDetails.getRestOperationType().name().toLowerCase();
        }

        if (!isBlank(requestDetails.getOperation())) {
            return requestDetails.getOperation();
        }

        return "-";
    }

    private String resourceId(RequestDetails requestDetails) {
        IIdType id = requestDetails.getId();
        if (id == null || !id.hasIdPart()) {
            return "-";
        }

        return id.getIdPart();
    }

    private boolean isInternalWrite(RequestDetails requestDetails) {
        return !isBlank(requestDetails.getHeader(ETL_API_KEY_HEADER));
    }

    private long durationMillis(RequestDetails requestDetails) {
        Object storedValue = requestDetails.getUserData().get(START_TIME_KEY);
        if (!(storedValue instanceof Long)) {
            return -1L;
        }

        return System.currentTimeMillis() - (Long) storedValue;
    }

    private String safe(String value) {
        if (isBlank(value)) {
            return "-";
        }

        return value.trim().replaceAll("\\s+", "_");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}