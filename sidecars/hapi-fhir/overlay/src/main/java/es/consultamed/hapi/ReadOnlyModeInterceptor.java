package es.consultamed.hapi;

import java.util.EnumSet;
import java.util.Set;

import ca.uhn.fhir.interceptor.api.Hook;
import ca.uhn.fhir.interceptor.api.Interceptor;
import ca.uhn.fhir.interceptor.api.Pointcut;
import ca.uhn.fhir.rest.api.RequestTypeEnum;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.server.exceptions.MethodNotAllowedException;

@Interceptor
public class ReadOnlyModeInterceptor {

    private static final String ETL_API_KEY_HEADER = "X-Consultamed-ETL-Key";
    private static final String DEFAULT_ETL_API_KEY = "consultamed-local-etl";

    private static final Set<RequestTypeEnum> ALLOWED_METHODS =
        EnumSet.of(RequestTypeEnum.GET, RequestTypeEnum.HEAD, RequestTypeEnum.OPTIONS);

    private static final String CONFIGURED_ETL_API_KEY = resolveConfiguredEtlApiKey();

    @Hook(Pointcut.SERVER_INCOMING_REQUEST_PRE_HANDLED)
    public void enforceReadOnly(RequestDetails requestDetails) {
        RequestTypeEnum requestType = requestDetails.getRequestType();
        if (requestType == null || ALLOWED_METHODS.contains(requestType)) {
            return;
        }

        if (isAuthorizedInternalWrite(requestDetails)) {
            return;
        }

        throw new MethodNotAllowedException(
            "ConsultaMed HAPI sidecar exposes read/search publicly and only allows internally keyed "
                + "ETL writes."
        );
    }

    private boolean isAuthorizedInternalWrite(RequestDetails requestDetails) {
        String providedApiKey = requestDetails.getHeader(ETL_API_KEY_HEADER);
        return providedApiKey != null && providedApiKey.equals(CONFIGURED_ETL_API_KEY);
    }

    private static String resolveConfiguredEtlApiKey() {
        String configuredValue = System.getenv("CONSULTAMED_ETL_API_KEY");
        if (configuredValue == null) {
            return DEFAULT_ETL_API_KEY;
        }

        String trimmedValue = configuredValue.trim();
        if (trimmedValue.isEmpty()) {
            return DEFAULT_ETL_API_KEY;
        }

        return trimmedValue;
    }
}