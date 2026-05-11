FROM python:3.12-slim

# Désactive la création de fichiers .pyc et force l'affichage des logs immédiats
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Installation des dépendances système minimales pour psycopg2 si nécessaire
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copie et installation des requirements
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . /app/

# Exposition du port par défaut
EXPOSE 8000

# Script de lancement par défaut
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
