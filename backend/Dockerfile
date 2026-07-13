FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt ./requirements.txt
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/* \
    && python -m pip install --upgrade pip setuptools wheel \
    && pip install -r requirements.txt gunicorn

# Copy application code
COPY backend/ ./backend
WORKDIR /app/backend

# Collect static files (if any) - non-fatal
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "shariah_fintech_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
