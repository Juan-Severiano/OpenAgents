FROM python:3.14

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN python3 -m venv /venv && \
    /venv/bin/pip install --no-cache-dir --upgrade pip && \
    /venv/bin/pip install --no-cache-dir .

ENV PATH="/venv/bin:$PATH"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
