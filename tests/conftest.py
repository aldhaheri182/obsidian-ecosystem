"""Shared pytest config for the integration + chaos test suites.

These tests assume `make up` has been run. They exercise the live stack via
the published NATS WS port (8080) and ClickHouse HTTP (8123).
"""

import pytest

pytest_plugins = []


@pytest.fixture(scope="session")
def nats_ws_url() -> str:
    return "ws://localhost:18080"


@pytest.fixture(scope="session")
def clickhouse_url() -> str:
    return "http://obsidian:obsidian@localhost:18123"
