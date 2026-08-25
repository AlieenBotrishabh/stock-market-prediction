"""
Cross-language feature-pipeline contract test.

The model is TRAINED on features built by ml-pipeline/features.py but is
SERVED features built by backend/src/services/features.js. If those two
disagree, the network receives inputs it never saw during training and the
prediction is silently wrong — with no error anywhere to notice.

The most delicate piece is the causal Haar denoising: it is hand-rolled in
both languages (no PyWavelets, to keep the CI runner lean) and it must
match bit for bit.

Run:
    python tests/test_features_parity.py
    # or: python -m pytest tests/test_features_parity.py -v

Requires Node with the backend's dependencies installed.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ml-pipeline"))

import features as F  # noqa: E402

TOLERANCE = 1e-9


def _synthetic_series(n=300, seed=7):
    """Deterministic price-like series: trend + seasonality + noise."""
    rng = np.random.default_rng(seed)
    return (
        100
        + np.cumsum(rng.normal(0, 1.5, n))
        + 10 * np.sin(np.arange(n) / 12)
    )


def _run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=str(ROOT / "backend"),
        capture_output=True,
        text=True,
        timeout=180,
    )
    if result.returncode != 0:
        raise AssertionError(f"Node failed:\n{result.stderr[:1500]}")
    return json.loads(result.stdout)


def test_haar_denoise_matches():
    """Global Haar denoising must be identical in both languages."""
    x = _synthetic_series()
    expected = F.haar_denoise(x, 2)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(x.tolist(), fh)
        path = Path(fh.name).as_posix()

    got = _run_node(f"""
      import fs from 'node:fs';
      import feat from './src/services/features.js';
      const x = JSON.parse(fs.readFileSync('{path}','utf8'));
      console.log(JSON.stringify(feat.haarDenoise(x, 2)));
    """)

    diff = np.abs(np.asarray(got) - expected).max()
    assert diff < TOLERANCE, f"haarDenoise differs by {diff:.3e}"


def test_causal_denoise_matches():
    """
    Causal denoising must match over the tail the JS actually computes.

    This is the anti-leak path: each point is denoised using only data at
    or before it. A mismatch here means live inference sees a differently
    smoothed series than training did.
    """
    x = _synthetic_series()
    tail = 80
    expected = F.denoise_causal(x, 2)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(x.tolist(), fh)
        path = Path(fh.name).as_posix()

    got = _run_node(f"""
      import fs from 'node:fs';
      import feat from './src/services/features.js';
      const x = JSON.parse(fs.readFileSync('{path}','utf8'));
      console.log(JSON.stringify(feat.denoiseCausalTail(x, 2, {tail})));
    """)

    got = np.asarray(got[-tail:], dtype=float)
    diff = np.abs(got - expected[-tail:]).max()
    assert diff < TOLERANCE, f"denoiseCausalTail differs by {diff:.3e}"


def test_causal_denoise_is_actually_causal():
    """
    Appending future data must not change any earlier denoised value.

    Without this the Haar transform smears future information backwards —
    measured at up to 1.83 price units at non-dyadic cut points — which
    would manufacture an impressive backtest that evaporates live.
    """
    x = _synthetic_series(n=400)
    for cut in (397, 398, 399, 401):
        short = F.denoise_causal(x[:cut], 2)
        long = F.denoise_causal(x, 2)[:cut]
        diff = np.abs(short - long).max()
        assert diff == 0.0, f"causal denoising leaked at cut={cut}: {diff:.3e}"


def test_ist_date_labelling():
    """
    Bars must be labelled by IST date in both languages.

    The Python client normalises timestamps to Asia/Kolkata; the JS client
    originally used the UTC date. For NSE equities those agree (the session
    runs 03:45-10:00 UTC) so stocks looked fine — but USDINR=X is quoted on
    Europe/London, and its bars landed on the wrong day, shifting the whole
    macro feature series by one session. Every dependent feature was then
    silently wrong at inference time while looking entirely plausible.
    """
    got = _run_node("""
      import y from './src/providers/yahoo.js';
      const h = await y.getHistory('USDINR=X', { range: '1mo' });
      console.log(JSON.stringify(h.candles.slice(-6).map(c => ({ date: c.date, c: c.c }))));
    """)

    import data_client as DC  # noqa: PLC0415  (needs ml-pipeline on sys.path)

    py = DC.fetch_ohlcv("USDINR=X", range_="1mo", use_cache=False)
    py_map = {
        str(row["date"])[:10]: float(row["close"])
        for _, row in py.iterrows()
    }

    matched = 0
    for bar in got:
        if bar["date"] in py_map:
            # Same label must carry the same close, or the two sides have
            # aligned different sessions onto the same date.
            assert abs(py_map[bar["date"]] - bar["c"]) < 1e-6, (
                f"{bar['date']}: JS {bar['c']} vs Python {py_map[bar['date']]}"
            )
            matched += 1

    assert matched >= 3, f"only {matched} dates lined up between the two clients"


if __name__ == "__main__":
    test_haar_denoise_matches()
    print("  PASS  haarDenoise matches Python")
    test_causal_denoise_matches()
    print("  PASS  denoiseCausalTail matches Python")
    test_causal_denoise_is_actually_causal()
    print("  PASS  causal denoising does not look ahead")
    test_ist_date_labelling()
    print("  PASS  bars labelled by IST date in both languages")
    print("\nFeature pipeline parity holds across Node and Python.")
