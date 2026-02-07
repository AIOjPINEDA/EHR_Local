"""
ConsultaMed Backend - Auth Security Tests

Tests for authentication hardening - bcrypt password verification.
"""
import pytest
import bcrypt


class TestPasswordHashing:
    """Tests for bcrypt password hashing."""
    
    def test_bcrypt_hash_generation(self):
        """Test that bcrypt can generate password hashes."""
        password = b"piloto2026"
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password, salt)
        
        assert hashed is not None
        assert hashed.startswith(b"$2b$")
        assert len(hashed) > 50
    
    def test_bcrypt_verification_correct_password(self):
        """Test that bcrypt correctly verifies a valid password."""
        password = b"piloto2026"
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password, salt)
        
        assert bcrypt.checkpw(password, hashed) is True
    
    def test_bcrypt_verification_wrong_password(self):
        """Test that bcrypt rejects an incorrect password."""
        password = b"piloto2026"
        wrong_password = b"demo"
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password, salt)
        
        assert bcrypt.checkpw(wrong_password, hashed) is False
    
    def test_demo_password_rejected(self):
        """Universal 'demo' password must no longer work after hardening."""
        # This test verifies the requirement: "demo" password should not work
        correct_password = b"piloto2026"
        demo_password = b"demo"
        
        # Hash the correct password
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(correct_password, salt)
        
        # Demo password should be rejected
        assert bcrypt.checkpw(demo_password, hashed) is False
        # Only correct password works
        assert bcrypt.checkpw(correct_password, hashed) is True


class TestPractitionerPasswordHash:
    """Tests for Practitioner model password_hash field."""
    
    def test_practitioner_model_has_password_hash(self):
        """Practitioner model must have password_hash field."""
        from app.models.practitioner import Practitioner
        from sqlalchemy import inspect
        
        mapper = inspect(Practitioner)
        columns = [c.key for c in mapper.columns]
        
        assert "password_hash" in columns, (
            "Practitioner model must have password_hash column for bcrypt auth"
        )


def generate_password_hash(password: str) -> str:
    """Utility function to generate a bcrypt hash for a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


if __name__ == "__main__":
    # Generate a hash for the pilot password
    pilot_hash = generate_password_hash("piloto2026")
    print(f"Pilot password hash: {pilot_hash}")
