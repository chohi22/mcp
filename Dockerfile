FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from existing project
COPY python_project/python_project/requirements.txt .

# Install additional dependencies for MCP server
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir requests flask

# Copy the Flask application
COPY src/api/app.py .

# Create non-root user
RUN useradd -m -u 1001 flask

# Change ownership
RUN chown -R flask:flask /app

# Switch to non-root user
USER flask

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the server
CMD ["python", "app.py"]