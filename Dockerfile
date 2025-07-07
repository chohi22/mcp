FROM python:3.9-alpine

WORKDIR /app

# Install basic dependencies
RUN apk add --no-cache gcc musl-dev

# Copy and install Python packages
RUN pip install flask pandas numpy requests

# Copy application
COPY src/api/app.py app.py

# Expose port
EXPOSE 5000

# Simple health check
RUN echo "print('OK')" > health.py

# Run the application
CMD ["python", "app.py"]