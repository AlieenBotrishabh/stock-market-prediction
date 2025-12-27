"""
Model training and evaluation module.

Handles:
- Building LSTM model architecture
- Training on preprocessed time-series data
- Evaluation metrics (MAE, RMSE, etc.)
- Model checkpointing and saving
- Prediction on new data
"""

import logging
from typing import Tuple, Optional, Dict, Any
import numpy as np
import json
from pathlib import Path

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, models
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning(
        "TensorFlow/Keras not available. Install with: pip install tensorflow"
    )

from config import Config

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(Config.LOGS_DIR / "model.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class StockPricePredictor:
    """
    LSTM-based time-series model for stock price prediction.
    
    Architecture:
    - Input: Sequences of (sequence_length, num_features)
    - LSTM layers: Capture temporal patterns
    - Dense layers: Non-linear transformations
    - Output: Next-day price (or direction)
    
    Training:
    - Loss: Mean Squared Error (MSE)
    - Optimizer: Adam with learning rate decay
    - Early stopping: Prevent overfitting
    """

    def __init__(self, input_shape: Tuple[int, int]):
        """
        Initialize model architecture.
        
        Args:
            input_shape: (sequence_length, num_features)
                Example: (10, 13) for 10 days of 13 features
        """
        if not TENSORFLOW_AVAILABLE:
            raise ImportError(
                "TensorFlow is required. Install with: pip install tensorflow"
            )
        
        self.input_shape = input_shape
        self.model = self._build_model()
        self.history = None
        self.metadata = {}

    def _build_model(self) -> keras.Model:
        """
        Build LSTM model architecture.
        
        Architecture:
        1. Input layer: (batch, sequence_length, num_features)
        2. LSTM layer 1: 64 units, return sequences
        3. Dropout: 0.2
        4. LSTM layer 2: 64 units
        5. Dropout: 0.2
        6. Dense layer: 32 units, ReLU
        7. Output layer: 1 unit (price prediction)
        
        Returns:
            Compiled Keras model
        """
        model = models.Sequential([
            # First LSTM layer
            layers.LSTM(
                Config.LSTM_UNITS,
                return_sequences=True,
                input_shape=self.input_shape,
                name="lstm_1"
            ),
            layers.Dropout(Config.DROPOUT_RATE, name="dropout_1"),
            
            # Second LSTM layer
            layers.LSTM(
                Config.LSTM_UNITS,
                return_sequences=False,
                name="lstm_2"
            ),
            layers.Dropout(Config.DROPOUT_RATE, name="dropout_2"),
            
            # Dense layers
            layers.Dense(32, activation="relu", name="dense_1"),
            layers.Dropout(Config.DROPOUT_RATE, name="dropout_3"),
            
            # Output layer
            layers.Dense(1, name="output"),
        ])
        
        # Compile with Adam optimizer and MSE loss
        optimizer = keras.optimizers.Adam(learning_rate=Config.LEARNING_RATE)
        model.compile(
            optimizer=optimizer,
            loss=Config.LOSS_FUNCTION,
            metrics=Config.METRICS,
        )
        
        logger.info("✓ Model architecture created")
        model.summary()
        
        return model

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        symbol: str = "stock",
    ) -> Dict[str, Any]:
        """
        Train model on training data with validation.
        
        Features:
        - Early stopping: Stop if validation loss doesn't improve
        - Model checkpointing: Save best model during training
        - Learning rate scheduling: Optional (configured in Keras)
        
        Args:
            X_train: Training features (num_samples, sequence_length, num_features)
            y_train: Training targets (num_samples,)
            X_val: Validation features
            y_val: Validation targets
            symbol: Stock symbol (for logging and checkpointing)
            
        Returns:
            Dict with training history and metrics
        """
        logger.info(f"Starting training for {symbol}...")
        logger.info(
            f"Training data: {X_train.shape}, Validation data: {X_val.shape}"
        )
        
        # Callbacks
        checkpoint_path = Config.get_model_path(f"{symbol}_best")
        early_stop = EarlyStopping(
            monitor="val_loss",
            patience=10,
            restore_best_weights=True,
            verbose=1,
        )
        checkpoint = ModelCheckpoint(
            filepath=str(checkpoint_path),
            monitor="val_loss",
            save_best_only=True,
            verbose=1,
        )
        
        # Train
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=Config.EPOCHS,
            batch_size=Config.BATCH_SIZE,
            callbacks=[early_stop, checkpoint],
            verbose=1,
        )
        
        self.history = history
        
        # Log results
        final_loss = history.history["loss"][-1]
        final_val_loss = history.history["val_loss"][-1]
        final_mae = history.history["mae"][-1]
        final_val_mae = history.history["val_mae"][-1]
        
        logger.info(f"✓ Training complete")
        logger.info(f"  Final loss: {final_loss:.6f}")
        logger.info(f"  Final val_loss: {final_val_loss:.6f}")
        logger.info(f"  Final MAE: {final_mae:.6f}")
        logger.info(f"  Final val_MAE: {final_val_mae:.6f}")
        
        # Store metadata
        self.metadata = {
            "symbol": symbol,
            "final_loss": float(final_loss),
            "final_val_loss": float(final_val_loss),
            "final_mae": float(final_mae),
            "final_val_mae": float(final_val_mae),
            "epochs_trained": len(history.history["loss"]),
            "input_shape": self.input_shape,
        }
        
        return {
            "loss": final_loss,
            "val_loss": final_val_loss,
            "mae": final_mae,
            "val_mae": final_val_mae,
            "epochs": len(history.history["loss"]),
        }

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
    ) -> Dict[str, float]:
        """
        Evaluate model on test set.
        
        Args:
            X_test: Test features
            y_test: Test targets
            
        Returns:
            Dict with loss and metrics
        """
        logger.info("Evaluating on test set...")
        
        loss, mae, mse = self.model.evaluate(X_test, y_test, verbose=0)
        
        # Compute RMSE
        rmse = np.sqrt(mse)
        
        # Get predictions for additional metrics
        y_pred = self.model.predict(X_test, verbose=0)
        mape = self._compute_mape(y_test, y_pred)
        
        logger.info(f"✓ Test Results:")
        logger.info(f"  Loss (MSE): {loss:.6f}")
        logger.info(f"  MAE: {mae:.6f}")
        logger.info(f"  RMSE: {rmse:.6f}")
        logger.info(f"  MAPE: {mape:.2f}%")
        
        return {
            "loss": float(loss),
            "mae": float(mae),
            "mse": float(mse),
            "rmse": float(rmse),
            "mape": float(mape),
        }

    @staticmethod
    def _compute_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """
        Compute Mean Absolute Percentage Error.
        
        MAPE = mean(|y_true - y_pred| / |y_true|) * 100
        
        Args:
            y_true: Actual values
            y_pred: Predicted values
            
        Returns:
            MAPE percentage
        """
        # Avoid division by zero
        mask = y_true != 0
        if mask.sum() == 0:
            return 0.0
        
        mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
        return mape

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions on new data.
        
        Args:
            X: Features (num_samples, sequence_length, num_features)
            
        Returns:
            Predictions (num_samples,)
        """
        return self.model.predict(X, verbose=0)

    def save(self, name: str = "stock_predictor") -> Path:
        """
        Save trained model and metadata.
        
        Args:
            name: Model name (default: stock_predictor)
            
        Returns:
            Path to saved model
        """
        model_path = Config.get_model_path(name)
        
        try:
            self.model.save(str(model_path))
            logger.info(f"✓ Saved model to {model_path}")
            
            # Save metadata
            metadata_path = model_path.with_suffix(".json")
            with open(metadata_path, "w") as f:
                json.dump(self.metadata, f, indent=2)
            logger.info(f"✓ Saved metadata to {metadata_path}")
            
            return model_path
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
            raise

    @staticmethod
    def load(name: str = "stock_predictor") -> Optional["StockPricePredictor"]:
        """
        Load previously trained model.
        
        Args:
            name: Model name
            
        Returns:
            StockPricePredictor instance or None if not found
        """
        model_path = Config.get_model_path(name)
        
        if not model_path.exists():
            logger.warning(f"Model not found at {model_path}")
            return None
        
        try:
            keras_model = keras.models.load_model(str(model_path))
            
            # Load metadata
            metadata_path = model_path.with_suffix(".json")
            metadata = {}
            if metadata_path.exists():
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)
            
            # Create instance
            input_shape = tuple(keras_model.input_shape[1:])
            predictor = StockPricePredictor(input_shape)
            predictor.model = keras_model
            predictor.metadata = metadata
            
            logger.info(f"✓ Loaded model from {model_path}")
            return predictor
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return None

    def get_summary(self) -> str:
        """Get model summary as string."""
        from io import StringIO
        import sys
        
        old_stdout = sys.stdout
        sys.stdout = StringIO()
        self.model.summary()
        summary = sys.stdout.getvalue()
        sys.stdout = old_stdout
        
        return summary


if __name__ == "__main__":
    if TENSORFLOW_AVAILABLE:
        print("Model training module loaded. Use with data_processor and api_client.")
    else:
        print("TensorFlow not installed. Install with: pip install tensorflow")
