"""The live-endpoint guard is load-bearing for M0 safety."""

import pytest
from paper_executor.alpaca_client import AlpacaClient, LiveEndpointRefused


def test_refuses_live_endpoint(monkeypatch):
    monkeypatch.setenv("ALPACA_API_KEY", "k")
    monkeypatch.setenv("ALPACA_API_SECRET", "s")
    with pytest.raises(LiveEndpointRefused):
        AlpacaClient(base_url="https://api.alpaca.markets")


def test_refuses_arbitrary_endpoint(monkeypatch):
    monkeypatch.setenv("ALPACA_API_KEY", "k")
    monkeypatch.setenv("ALPACA_API_SECRET", "s")
    with pytest.raises(LiveEndpointRefused):
        AlpacaClient(base_url="https://evil.example.com")
