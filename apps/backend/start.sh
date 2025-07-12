#!/bin/sh
cd backend

echo "Waiting for database to be ready..."

while ! mysqladmin ping -h "$DB_HOST" --silent; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is up - continuing"

# Run migrations with fake initial to handle existing tables
python manage.py makemigrations
python manage.py migrate --fake-initial

# If migrations still fail, try a more aggressive approach
if [ $? -ne 0 ]; then
    echo "Migration failed, trying to reset database..."
    python manage.py migrate --fake
    python manage.py migrate
fi

# Create superuser if not exists
python manage.py shell -c "from django.contrib.auth.models import User; import os; username=os.environ['DJANGO_SUPERUSER_NAME']; password=os.environ['DJANGO_SUPERUSER_PASSWORD']; User.objects.create_superuser(username, email='', password=password) if not User.objects.filter(username=username).exists() else None"

# Load fixtures with error handling and timeout (skip if SKIP_FIXTURES is set)
if [ "$SKIP_FIXTURES" != "true" ]; then
    echo "Loading fixtures..."
    for fixture in fixtures/*.json; do
        if [ -f "$fixture" ]; then
            echo "Loading $fixture..."
            timeout 60 python manage.py loaddata "$fixture" || echo "Warning: Failed to load $fixture (timeout or error)"
        fi
    done
else
    echo "Skipping fixture loading (SKIP_FIXTURES=true)"
fi

# Check DEBUG value to determine server type
if [ "$DEBUG" = "False" ] || [ "$DEBUG" = "false" ]; then
  echo "🔧 Starting Gunicorn server for production..."
  exec uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --workers 3
else
  echo "🚧 Starting Django development server..."
  exec uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --reload
fi