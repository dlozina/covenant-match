FROM mongo:latest

RUN apt-get update && apt-get install -y \
    cron \
    && rm -rf /var/lib/apt/lists/*

COPY backup.sh /backup.sh
COPY crontab /etc/cron.d/backup-cron
RUN chmod 0644 /etc/cron.d/backup-cron && \
    chmod +x /backup.sh

CMD ["cron", "-f"]