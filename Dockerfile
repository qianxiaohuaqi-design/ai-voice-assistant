# Use official lightweight Python image
FROM python:3.10-slim

# Set work directory
WORKDIR /app

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies if any are needed (none for requests/fastapi)
# Copy dependencies list first to leverage Docker cache
COPY requirements.txt /app/

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source files
COPY web_app.py /app/
COPY models.py /app/
COPY static/ /app/static/

# Expose the application port
EXPOSE 8000

# Start uvicorn server binding to all interfaces (0.0.0.0)
CMD ["uvicorn", "web_app:app", "--host", "0.0.0.0", "--port", "8000"]
