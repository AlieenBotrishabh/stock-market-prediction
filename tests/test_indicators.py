"""
Cross-language indicator contract test.

The UI panel computes indicators in Node (backend/src/services/indicators.js)
while the model trains on the Python implementation (ml-pipeline/indicators.py).
If they drift, the site contradicts its own model, so this asserts the two
agree on a shared fixture.

Regenerate the fixture after intentionally changing either implementation:

    node --input-type=module -e "
      import y from './backend/src/providers/yahoo.js';
      import ind from './backend/src/services/indicators.js';
      import fs from 'fs';
      const h = await y.getHistory('TCS', { range: '2y' });
      const { series } = ind.computeAll(h.candles);
      fs.writeFileSync('tests/fixtures/indicators.json', JSON.stringify({
        symbol: 'TCS', generatedBy: 'node', bars: h.candles.length,
        candles: h.candles.map(c => ({date:c.date,o:c.o,h:c.h,l:c.l,c:c.c,v:c.v})),
        series,
      }, null, 1));
    "

Run:  python -m pytest tests/test_indicators.py -v
      (or plain `python tests/test_indicators.py`)
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ml-pipeline"))

import indicators as I  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "indicators.json"

# JS series name -> Python column name
PAIRS = [
    ("sma20", "sma20"), ("sma50", "sma50"), ("sma200", "sma200"),
    ("ema20", "ema20"), ("ema50", "ema50"), ("ema200", "ema200"),
    ("rsi14", "rsi14"), ("atr14", "atr14"),
    ("macd", "macd"), ("macdSignal", "macd_signal"),
    ("macdHistogram", "macd_histogram"),
    ("bbUpper", "bb_upper"), ("bbMiddle", "bb_middle"),
    ("bbLower", "bb_lower"), ("bbPercentB", "bb_percent_b"),
    ("roc10", "roc10"),
]

# Floating-point associativity differs slightly between the two runtimes
# (notably in the Bollinger variance sum), so an exact match is not the
# right bar. 1e-6 is far tighter than any value that could change a
# rendered figure or a model input.
TOLERANCE = 1e-6


def _load():
    if not FIXTURE.exists():
        raise SystemExit(f"Fixture missing: {FIXTURE}. See the docstring to regenerate.")
    fx = json.loads(FIXTURE.read_text())
    df = pd.DataFrame(fx["candles"]).rename(
        columns={"o": "open", "h": "high", "l": "low", "c": "close", "v": "volume"}
    )
    return fx, I.compute_all(df)


def test_indicators_match_node():
    fx, out = _load()
    failures = []

    for js_name, py_name in PAIRS:
        js = np.array([np.nan if v is None else v for v in fx["series"][js_name]], dtype=float)
        py = out[py_name].to_numpy(dtype=float)

        assert len(js) == len(py), f"{js_name}: length {len(js)} vs {len(py)}"

        # The NaN masks must align too: if one side defines an indicator a
        # bar earlier than the other, the warm-up periods disagree.
        mask_diff = int((np.isnan(js) != np.isnan(py)).sum())
        both = ~np.isnan(js) & ~np.isnan(py)
        max_diff = float(np.abs(js[both] - py[both]).max()) if both.any() else 0.0

        if mask_diff or max_diff > TOLERANCE:
            failures.append(f"{js_name}: max diff {max_diff:.2e}, nan-mask mismatch {mask_diff}")

    assert not failures, "Node/Python indicator drift:\n  " + "\n  ".join(failures)


def test_rsi_known_answer():
    """Wilder's own worked example (1978), as a sanity anchor."""
    closes = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
              46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41,
              46.22, 45.64]
    rsi = I.rsi(np.array(closes), 14)
    # Published value is ~70.5; the small offset is a seeding convention
    # difference that washes out over a longer series.
    assert 69.5 < rsi[14] < 71.5, f"RSI-14 out of range: {rsi[14]}"
    assert np.isnan(rsi[13]), "RSI must be undefined before its warm-up completes"


def test_no_zero_padding():
    """Undefined indicator values must be NaN, never 0 -- a 0 would be read
    as a real value by both the chart and the model."""
    _, out = _load()
    assert np.isnan(out["sma200"].to_numpy(dtype=float)[0])
    assert np.isnan(out["rsi14"].to_numpy(dtype=float)[0])


if __name__ == "__main__":
    test_indicators_match_node()
    test_rsi_known_answer()
    test_no_zero_padding()
    print("All indicator contract tests passed.")
