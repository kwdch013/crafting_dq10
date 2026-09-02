FROM python:3.14-slim

WORKDIR /usr/src/app

# 依存だけを先に入れ、アプリコード変更時にインストール層を再利用する
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./

ENV PORT=8000

EXPOSE 8000

CMD ["python", "-u", "main.py"]
