"""Pure-function tests for the SMA logic."""

from momentum_signal.sma import SmaState, update


def test_no_signal_before_history_fills():
    state = SmaState(short_window=3, long_window=5)
    for p in [100.0, 101.0, 102.0, 103.0]:
        assert update(state, p) is None


def test_buy_then_sell_crossover():
    state = SmaState(short_window=3, long_window=5)
    # Rising trend -> short > long -> BUY
    prices = [100.0, 100.0, 100.0, 100.0, 100.0, 110.0, 120.0, 130.0]
    signals = [update(state, p) for p in prices]
    buys = [s for s in signals if s is not None and s.direction == 1]
    assert buys, "expected at least one BUY"

    # Now falling hard
    for p in [100.0, 90.0, 80.0, 70.0, 60.0, 50.0]:
        s = update(state, p)
        if s is not None and s.direction == -1:
            return
    raise AssertionError("expected a SELL crossover after falling trend")


def test_flat_prices_produce_no_signal():
    state = SmaState(short_window=3, long_window=5)
    for _ in range(20):
        assert update(state, 100.0) is None


def test_confidence_is_bounded():
    state = SmaState(short_window=3, long_window=5)
    prices = [100.0, 100.0, 100.0, 100.0, 100.0, 200.0, 300.0, 400.0]
    for p in prices:
        s = update(state, p)
        if s is not None:
            assert 0.0 <= s.confidence <= 1.0
