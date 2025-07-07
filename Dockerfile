FROM python:3.9-slim

WORKDIR /app

COPY src/api/app.py .

RUN pip install flask pandas numpy requests

EXPOSE 5000

CMD ["python", "app.py"]