"""
Upload trained models (models/*.keras + models/*.json) to the Hugging Face Hub.

Log in once before running:
    huggingface-cli login        (or set HF_TOKEN in .env)
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import upload_folder

load_dotenv()
HF_REPO_ID = os.getenv("HF_REPO_ID", "Ace6868/stock-price-prediction-lstm")
MODELS_DIR = Path(__file__).parent / "models"

if __name__ == "__main__":
    upload_folder(
        folder_path=str(MODELS_DIR),
        repo_id=HF_REPO_ID,
        repo_type="model",
        allow_patterns=["*.keras", "*.json"],
        token=os.getenv("HF_TOKEN") or None,
    )
    print(f"Uploaded models to https://huggingface.co/{HF_REPO_ID}")
