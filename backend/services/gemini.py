"""
Legacy Gemini service shim - redirects to Grok AI service.
"""
from services.grok import get_advisory, _demo_advisory

__all__ = ["get_advisory", "_demo_advisory"]
