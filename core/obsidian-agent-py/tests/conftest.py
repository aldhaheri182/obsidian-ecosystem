"""Shared pytest fixtures."""

import pytest


@pytest.fixture
def empty_envelope_fields():
    from obsidian_agent.bus.canonical import EnvelopeFields
    return EnvelopeFields()
