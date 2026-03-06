FROM python:3.12.3-slim

# zmienne środowiskowe
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# katalog roboczy
WORKDIR /app

# instalacja zależności systemowych
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# kopiowanie requirements
COPY backend/requirements.txt .

# instalacja python packages
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# kopiowanie kodu
COPY backend /app

# port django
EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
