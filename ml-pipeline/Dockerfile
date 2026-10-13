FROM python:3.11-slim

# Hugging Face Spaces runs containers as user 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

# 7860 is the Hugging Face Spaces default; override PORT elsewhere (e.g. docker-compose)
ENV PORT=7860
EXPOSE 7860

CMD gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
