package es.consultamed.hapi;

import java.util.EnumSet;
import java.util.Set;

import ca.uhn.fhir.interceptor.api.Hook;
import ca.uhn.fhir.interceptor.api.Interceptor;
import ca.uhn.fhir.interceptor.api.Pointcut;
import ca.uhn.fhir.rest.api.RestOperationTypeEnum;
import ca.uhn.fhir.rest.api.RequestTypeEnum;
import ca.uhn.fhir.rest.api.server.RequestDetails;
import ca.uhn.fhir.rest.server.exceptions.MethodNotAllowedException;

@Interceptor
public class ReadOnlyModeInterceptor {

    private static final String ETL_API_KEY_HEADER = "X-Consultamed-ETL-Key";
    private static final String DEFAULT_ETL_API_KEY = "consultamed-local-etl";

    private static final Set<RequestTypeEnum> ALLOWED_PUBLIC_METHODS =
        EnumSet.of(RequestTypeEnum.GET, RequestTypeEnum.HEAD);
    private static final Set<RestOperationTypeEnum> ALLOWED_PUBLIC_OPERATIONS = EnumSet.of(
        RestOperationTypeEnum.METADATA,
        RestOperationTypeEnum.READ,
        RestOperationTypeEnum.SEARCH_TYPE,
        RestOperationTypeEnum.GET_PAGE
    );
    private static final Set<String> ALLOWED_RESOURCE_TYPES = Set.of(
        "Patient",
        "Practitioner",
        "Encounter",
        "Condition",
        "MedicationRequest",
        "AllergyIntolerance"
    );

    private static final String CONFIGURED_ETL_API_KEY = resolveConfiguredEtlApiKey();

    @Hook(Pointcut.SERVER_INCOMING_REQUEST_PRE_HANDLED)
    public void enforceReadOnly(RequestDetails requestDetails) {
        RequestTypeEnum requestType = requestDetails.getRequestType();
        if (requestType == RequestTypeEnum.OPTIONS || isPublicRequestAllowed(requestDetails)) {
            return;
        }

        if (requestType != null && !ALLOWED_PUBLIC_METHODS.contains(requestType) && isAuthorizedInternalWrite(requestDetails)) {
            return;
        }

        throw new MethodNotAllowedException(
            "ConsultaMed HAPI sidecar publicly exposes only CapabilityStatement, read, search, "
                + "and search Bundle page retrieval on the agreed six-resource subset; internally "
                + "keyed ETL writes remain allowed."
        );
    }

    private boolean isPublicRequestAllowed(RequestDetails requestDetails) {
        RequestTypeEnum requestType = requestDetails.getRequestType();
        if (requestType == null || !ALLOWED_PUBLIC_METHODS.contains(requestType)) {
            return false;
        }

        RestOperationTypeEnum operationType = requestDetails.getRestOperationType();
        if (operationType == null || !ALLOWED_PUBLIC_OPERATIONS.contains(operationType)) {
            return false;
        }

        return isSystemLevelPublicOperation(operationType) || isAllowedResourceType(requestDetails.getResourceName());
    }

    private boolean isSystemLevelPublicOperation(RestOperationTypeEnum operationType) {
        return operationType == RestOperationTypeEnum.METADATA
            || operationType == RestOperationTypeEnum.GET_PAGE;
    }

    private boolean isAllowedResourceType(String resourceName) {
        return resourceName != null && ALLOWED_RESOURCE_TYPES.contains(resourceName);
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