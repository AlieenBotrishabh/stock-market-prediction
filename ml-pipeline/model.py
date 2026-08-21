"""
The LSTM model.

Architecture follows Bhandari et al. (2022), whose central finding was that
a SINGLE LSTM layer outperformed every multilayer variant they tested --
their best model (1 layer, 150 neurons) scored test MAPE 0.80%, RMSE 40.46,
R 0.9976, while stacked configurations were consistently worse.

The previous implementation here used 2 x LSTM(64) + Dense(32), i.e. the
stacked arrangement the paper found inferior, and had never been trained
(models/ and data/ were empty; model.log had zero lines).

Moghar & Hamiche (2020) document that an LSTM loses tracking when the
asset's volatility regime shifts. That is why training reports residual
spread and why backtest.py validates walk-forward rather than on one split.
"""

from __future__ import annotations

import logging
import os

import numpy as np

# Keep TF quiet and deterministic-ish before it is imported.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf  # noqa: E402
from tensorflow import keras  # noqa: E402

import config  # noqa: E402

log = logging.getLogger(__name__)


def set_seeds(seed: int = config.RANDOM_SEED) -> None:
    np.random.seed(seed)
    tf.random.set_seed(seed)


def _optimizer(name: str, learning_rate: float):
    """Bhandari's grid was {Adam, Adagrad, Nadam} x {0.1, 0.01, 0.001}."""
    name = name.lower()
    if name == "adam":
        return keras.optimizers.Adam(learning_rate=learning_rate)
    if name == "nadam":
        return keras.optimizers.Nadam(learning_rate=learning_rate)
    if name == "adagrad":
        return keras.optimizers.Adagrad(learning_rate=learning_rate)
    raise ValueError(f"Unknown optimizer: {name}")


def build_model(
    time_step: int,
    n_features: int,
    units: int = config.LSTM_UNITS,
    layers: int = config.LSTM_LAYERS,
    dropout: float = config.DROPOUT,
    optimizer: str = config.OPTIMIZER,
    learning_rate: float = config.LEARNING_RATE,
) -> keras.Model:
    """
    Build the regression network.

    Default is Bhandari's winner: one LSTM layer of 150 units into a single
    linear output. `layers > 1` is supported for reproducing their
    (worse-performing) multilayer comparison.
    """
    model = keras.Sequential(name="stock_lstm")
    model.add(keras.layers.Input(shape=(time_step, n_features)))

    for i in range(layers):
        is_last = i == layers - 1
        model.add(
            keras.layers.LSTM(
                units if is_last else max(units // (2 ** (layers - 1 - i)), 8),
                return_sequences=not is_last,
                name=f"lstm_{i + 1}",
            )
        )
        if dropout:
            model.add(keras.layers.Dropout(dropout, name=f"dropout_{i + 1}"))

    # Linear output: this is a regression onto the scaled close, not a
    # classification. No activation.
    model.add(keras.layers.Dense(1, name="output"))

    model.compile(
        optimizer=_optimizer(optimizer, learning_rate),
        loss="mean_squared_error",
        metrics=["mae"],
    )
    return model


def train_model(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_val: np.ndarray | None = None,
    y_val: np.ndarray | None = None,
    *,
    epochs: int = config.EPOCHS,
    batch_size: int = config.BATCH_SIZE,
    verbose: int = 0,
    base_model: keras.Model | None = None,
    **build_kwargs,
) -> tuple[keras.Model, dict]:
    """
    Fit the model, with early stopping on validation loss.

    `base_model` warm-starts from an already-trained network (transfer
    learning). Hiransha et al. (2018) found a model trained on one NSE
    stock transferred to other NSE stocks and even to NYSE, so fine-tuning
    a shared base is both cheaper and better-supported than 15 cold starts.
    """
    time_step, n_features = x_train.shape[1], x_train.shape[2]

    if base_model is not None:
        model = keras.models.clone_model(base_model)
        model.set_weights(base_model.get_weights())
        model.compile(
            optimizer=_optimizer(
                build_kwargs.get("optimizer", config.OPTIMIZER),
                # Lower LR when fine-tuning so the transferred weights are
                # refined rather than overwritten.
                build_kwargs.get("learning_rate", config.LEARNING_RATE) / 10,
            ),
            loss="mean_squared_error",
            metrics=["mae"],
        )
    else:
        model = build_model(time_step, n_features, **build_kwargs)

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss" if x_val is not None else "loss",
            patience=config.EARLY_STOPPING_PATIENCE,
            restore_best_weights=True,
            verbose=0,
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss" if x_val is not None else "loss",
            factor=0.5, patience=6, min_lr=1e-5, verbose=0,
        ),
    ]

    fit_kwargs = dict(
        x=x_train, y=y_train, epochs=epochs, batch_size=batch_size,
        callbacks=callbacks, verbose=verbose,
        # Never shuffle: these are time-ordered sequences.
        shuffle=False,
    )
    if x_val is not None and len(x_val):
        fit_kwargs["validation_data"] = (x_val, y_val)

    history = model.fit(**fit_kwargs)
    return model, {k: [float(x) for x in v] for k, v in history.history.items()}


def save_model(model: keras.Model, symbol: str, version: str = config.MODEL_VERSION) -> str:
    path = config.MODEL_DIR / f"{symbol.upper()}_{version}.keras"
    model.save(path)
    log.info("saved model -> %s", path)
    return str(path)


def load_model(symbol: str, version: str = config.MODEL_VERSION):
    path = config.MODEL_DIR / f"{symbol.upper()}_{version}.keras"
    if not path.exists():
        return None
    return keras.models.load_model(path)


__all__ = ["build_model", "train_model", "save_model", "load_model", "set_seeds"]
