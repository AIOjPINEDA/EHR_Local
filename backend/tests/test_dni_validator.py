"""
ConsultaMed Backend - DNI Validator Tests

Tests para validación de DNI/NIE español.
"""
import pytest
from app.validators.dni import (
    validate_dni_español,
    validate_nie_español,
    validate_documento_identidad,
    get_letra_dni,
    format_dni,
)


class TestValidateDNIEspañol:
    """Tests for Spanish DNI validation."""
    
    def test_valid_dni_common_cases(self):
        """Test valid DNIs with correct letters."""
        # Known valid DNIs (number % 23 = position in letter table)
        assert validate_dni_español("12345678Z") is True
        assert validate_dni_español("00000000T") is True
        assert validate_dni_español("11111111H") is True
        assert validate_dni_español("22222222J") is True
    
    def test_valid_dni_lowercase(self):
        """Test that lowercase letters are accepted."""
        assert validate_dni_español("12345678z") is True
    
    def test_valid_dni_with_spaces(self):
        """Test that spaces are trimmed."""
        assert validate_dni_español(" 12345678Z ") is True
    
    def test_invalid_dni_wrong_letter(self):
        """Test DNIs with incorrect letters."""
        assert validate_dni_español("12345678A") is False
        assert validate_dni_español("00000000A") is False
    
    def test_invalid_dni_too_short(self):
        """Test DNIs with less than 9 characters."""
        assert validate_dni_español("1234567Z") is False
        assert validate_dni_español("123456Z") is False
        assert validate_dni_español("") is False
    
    def test_invalid_dni_too_long(self):
        """Test DNIs with more than 9 characters."""
        assert validate_dni_español("123456789Z") is False
        assert validate_dni_español("1234567890Z") is False
    
    def test_invalid_dni_non_numeric(self):
        """Test DNIs with non-numeric characters in number part."""
        assert validate_dni_español("1234567AZ") is False
        assert validate_dni_español("ABCDEFGHZ") is False
    
    def test_invalid_dni_no_letter(self):
        """Test DNIs without letter."""
        assert validate_dni_español("123456789") is False


class TestValidateNIEEspañol:
    """Tests for Spanish NIE validation."""
    
    def test_valid_nie_x_prefix(self):
        """Test valid NIEs starting with X."""
        # X = 0, so X0000000T should be valid (00000000T is valid DNI)
        assert validate_nie_español("X0000000T") is True
    
    def test_valid_nie_y_prefix(self):
        """Test valid NIEs starting with Y."""
        # Y = 1, so Y0000000R should be valid (10000000R)
        assert validate_nie_español("Y0000000R") is True
    
    def test_valid_nie_z_prefix(self):
        """Test valid NIEs starting with Z."""
        # Z = 2, so Z0000000M should be valid (20000000M)
        assert validate_nie_español("Z0000000M") is True
    
    def test_valid_nie_lowercase(self):
        """Test that lowercase is accepted."""
        assert validate_nie_español("x0000000t") is True
    
    def test_invalid_nie_wrong_prefix(self):
        """Test NIEs with invalid prefix."""
        assert validate_nie_español("A1234567L") is False
        assert validate_nie_español("11234567L") is False
    
    def test_invalid_nie_wrong_letter(self):
        """Test NIEs with incorrect verification letter."""
        assert validate_nie_español("X0000000A") is False


class TestValidateDocumentoIdentidad:
    """Tests for automatic DNI/NIE detection and validation."""
    
    def test_detect_and_validate_dni(self):
        """Test automatic detection of DNI."""
        is_valid, doc_type = validate_documento_identidad("12345678Z")
        assert is_valid is True
        assert doc_type == "DNI"
    
    def test_detect_and_validate_nie(self):
        """Test automatic detection of NIE."""
        is_valid, doc_type = validate_documento_identidad("X0000000T")
        assert is_valid is True
        assert doc_type == "NIE"
    
    def test_detect_invalid_dni(self):
        """Test detection of invalid DNI."""
        is_valid, doc_type = validate_documento_identidad("12345678A")
        assert is_valid is False
        assert doc_type == "DNI"
    
    def test_detect_unknown_format(self):
        """Test unknown document format."""
        is_valid, doc_type = validate_documento_identidad("ABCDEFGHI")
        assert is_valid is False
        assert doc_type == "UNKNOWN"
    
    def test_empty_document(self):
        """Test empty document."""
        is_valid, doc_type = validate_documento_identidad("")
        assert is_valid is False
        assert doc_type == "UNKNOWN"


class TestGetLetraDNI:
    """Tests for letter calculation."""
    
    def test_calculate_letter(self):
        """Test letter calculation from numbers."""
        assert get_letra_dni("12345678") == "Z"
        assert get_letra_dni("00000000") == "T"
    
    def test_invalid_input(self):
        """Test with invalid input."""
        with pytest.raises(ValueError):
            get_letra_dni("1234567")  # Too short
        
        with pytest.raises(ValueError):
            get_letra_dni("123456789")  # Too long
        
        with pytest.raises(ValueError):
            get_letra_dni("1234567A")  # Contains letter


class TestFormatDNI:
    """Tests for DNI formatting."""
    
    def test_format_uppercase(self):
        """Test uppercase conversion."""
        assert format_dni("12345678z") == "12345678Z"
    
    def test_format_strip_spaces(self):
        """Test space trimming."""
        assert format_dni(" 12345678Z ") == "12345678Z"
    
    def test_format_combined(self):
        """Test combined formatting."""
        assert format_dni(" 12345678z ") == "12345678Z"
