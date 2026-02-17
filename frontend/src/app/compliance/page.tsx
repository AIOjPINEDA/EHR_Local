import { parseRadarMarkdown } from "@/lib/compliance/parse-radar";
import { CompliancePage } from "@/components/compliance/compliance-page";

export default function ComplianceRoute() {
  const data = parseRadarMarkdown();
  return <CompliancePage data={data} />;
}
