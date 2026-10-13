"""
Deploy this folder (the Flask API) to a free Hugging Face Docker Space.

Log in once before running:
    hf auth login        (or set HF_TOKEN in .env)
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import HfApi

load_dotenv()
SPACE_ID = os.getenv("HF_SPACE_ID", "Ace6868/stockpulse-ml")

if __name__ == "__main__":
    api = HfApi(token=os.getenv("HF_TOKEN") or None)
    api.create_repo(SPACE_ID, repo_type="space", space_sdk="docker", exist_ok=True)
    api.upload_folder(
        folder_path=str(Path(__file__).parent),
        repo_id=SPACE_ID,
        repo_type="space",
        ignore_patterns=["models/*", "__pycache__/*", ".env", "*.pyc"],
    )
    owner, name = SPACE_ID.split("/")
    print(f"Space: https://huggingface.co/spaces/{SPACE_ID}")
    print(f"API:   https://{owner.lower()}-{name.lower().replace('_', '-')}.hf.space/predict/RELIANCE")
