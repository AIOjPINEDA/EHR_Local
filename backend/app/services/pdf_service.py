"""
ConsultaMed Backend - PDF Generation Service

Genera recetas médicas en PDF usando WeasyPrint.
"""
from pathlib import Path
from typing import List, Dict, Any

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS


class PDFService:
    """Service for generating PDF prescriptions."""
    
    def __init__(self):
        """Initialize PDF service with templates directory."""
        template_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(template_dir)))
    
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
        
        # Render HTML
        html_content = template.render(
            patient=patient,
            practitioner=practitioner,
            encounter=encounter,
            medications=medications,
            instructions=instructions,
        )
        
        # CSS for A4 page
        css = CSS(string='''
            @page {
                size: A4;
                margin: 2cm;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.4;
            }
        ''')
        
        # Generate PDF
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf(stylesheets=[css])
        
        return pdf_bytes
    
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
