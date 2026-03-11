package es.consultamed.hapi;

import java.util.Set;

import org.hl7.fhir.instance.model.api.IBaseConformance;
import org.hl7.fhir.r5.model.CapabilityStatement;
import org.hl7.fhir.r5.model.CapabilityStatement.CapabilityStatementRestResourceComponent;
import org.hl7.fhir.r5.model.CapabilityStatement.ResourceInteractionComponent;
import org.hl7.fhir.r5.model.CapabilityStatement.TypeRestfulInteraction;

import ca.uhn.fhir.interceptor.api.Hook;
import ca.uhn.fhir.interceptor.api.Interceptor;
import ca.uhn.fhir.interceptor.api.Pointcut;

@Interceptor
public class CapabilityStatementCustomizer {

    private static final Set<String> ALLOWED_RESOURCE_TYPES = Set.of(
        "Patient",
        "Practitioner",
        "Encounter",
        "Condition",
        "MedicationRequest",
        "AllergyIntolerance"
    );

    @Hook(Pointcut.SERVER_CAPABILITY_STATEMENT_GENERATED)
    public void customize(IBaseConformance capabilityStatement) {
        if (!(capabilityStatement instanceof CapabilityStatement statement)) {
            return;
        }

        statement.getSoftware().setName("ConsultaMed HAPI Sidecar").setVersion("wave-1e-read-search");
        statement.setDescription(
            "ConsultaMed local HAPI FHIR R5 sidecar. Public surface is CapabilityStatement, read, and search on the agreed six-resource subset, including search Bundle page retrieval; FastAPI remains the source of truth."
        );

        statement.getRest().forEach(rest -> {
            rest.setDocumentation(
                "ConsultaMed local surface: metadata plus read/search on the agreed six-resource subset."
            );
            rest.getInteraction().clear();
            rest.getOperation().clear();
            rest.getResource().removeIf(resource -> !ALLOWED_RESOURCE_TYPES.contains(resource.getType()));
            rest.getResource().forEach(this::restrictInteractions);
        });
    }

    private void restrictInteractions(CapabilityStatementRestResourceComponent resource) {
        resource.setDocumentation(
            "ConsultaMed sidecar exposes public read and search-type interactions only."
        );
        resource.getOperation().clear();
        resource.getInteraction().removeIf(this::isNotReadOrSearch);
    }

    private boolean isNotReadOrSearch(
        ResourceInteractionComponent interaction
    ) {
        return interaction.getCode() != TypeRestfulInteraction.READ
            && interaction.getCode() != TypeRestfulInteraction.SEARCHTYPE;
    }
}