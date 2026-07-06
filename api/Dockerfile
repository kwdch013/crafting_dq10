FROM python:3.14-alpine

WORKDIR /usr/src/app

COPY api/ ./

ENV PORT=8000

EXPOSE 8000

CMD ["python", "-u", "main.py"]
