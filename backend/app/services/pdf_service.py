"""
ConsultaMed Backend - PDF Generation Service

Genera recetas médicas en PDF usando WeasyPrint.
"""
import base64
from pathlib import Path
from typing import List, Dict, Any, cast, Optional

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS


class PDFService:
    """Service for generating PDF prescriptions."""
    
    def __init__(self) -> None:
        """Initialize PDF service with templates directory."""
        template_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(template_dir)))
        self.logo_path = template_dir / "assets" / "logo-guadalix.png"
        self.logo_data_uri = self._load_logo_data_uri()
    
    def generate_prescription_pdf(
        self,
        patient: Dict[str, Any],
        practitioner: Dict[str, Any],
        encounter: Dict[str, Any],
        medications: List[Dict[str, Any]],
        instructions: str = ""
    ) -> bytes:
        """
        Generate prescription PDF from encounter data.
        
        Args:
            patient: Patient data (full_name, identifier_value, age)
            practitioner: Practitioner data (full_name, identifier_value, qualification_code)
            encounter: Encounter data (diagnosis, date)
            medications: List of medications with dosage
            instructions: Additional instructions
            
        Returns:
            PDF file as bytes
        """
        # Load template
        template = self.env.get_template("prescription.html")
        normalized_medications = self._normalize_medications(medications)
        
        # Render HTML
        html_content = template.render(
            patient=patient,
            practitioner=practitioner,
            encounter=encounter,
            medications=normalized_medications,
            instructions=instructions,
            logo_data_uri=self.logo_data_uri,
        )
        
        # CSS for A4 page
        css = CSS(string='''
            @page {
                size: A4;
                margin: 7mm;
            }
        ''')
        
        # Generate PDF
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf(stylesheets=[css])
        
        return cast(bytes, pdf_bytes)

    def _load_logo_data_uri(self) -> Optional[str]:
        """Carga el logo del hospital como data URI para incrustarlo en el PDF."""
        if not self.logo_path.exists():
            return None

        image_bytes = self.logo_path.read_bytes()
        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f"data:image/png;base64,{encoded}"

    @staticmethod
    def _normalize_medications(medications: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Normaliza la estructura de medicamentos para el template PDF."""
        normalized: List[Dict[str, str]] = []
        unit_map = {
            "d": "días",
            "wk": "semanas",
            "mo": "meses",
            "h": "horas",
        }

        for medication in medications:
            name = str(
                medication.get("name")
                or medication.get("medication_text")
                or medication.get("medication")
                or ""
            ).strip()
            dosage = str(
                medication.get("dosage")
                or medication.get("dosage_text")
                or ""
            ).strip()

            duration = str(medication.get("duration") or "").strip()
            if not duration:
                duration_value = medication.get("duration_value")
                duration_unit = medication.get("duration_unit")
                if duration_value:
                    duration_label = unit_map.get(str(duration_unit), str(duration_unit or ""))
                    duration = f"{duration_value} {duration_label}".strip()

            if not name and not dosage and not duration:
                continue

            normalized.append(
                {
                    "name": name,
                    "dosage": dosage,
                    "duration": duration,
                }
            )

        return normalized
    
    def generate_prescription_preview(
        self,
        patient: Dict[str, Any],
        practitioner: Dict[str, Any],
        encounter: Dict[str, Any],
        medications: List[Dict[str, Any]],
        instructions: str = ""
    ) -> Dict[str, Any]:
        """
        Generate prescription preview data for frontend.
        
        Returns structured data for rendering preview component.
        """
        return {
            "patient": {
                "full_name": patient.get("full_name"),
                "identifier_value": patient.get("identifier_value"),
                "age": patient.get("age"),
                "gender": patient.get("gender"),
            },
            "practitioner": {
                "full_name": f"Dr/Dra. {practitioner.get('full_name')}",
                "identifier_value": practitioner.get("identifier_value"),
                "qualification_code": practitioner.get("qualification_code"),
            },
            "date": encounter.get("date"),
            "diagnosis": encounter.get("diagnosis"),
            "medications": medications,
            "instructions": instructions,
        }
