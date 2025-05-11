FROM mongo:latest

RUN apt-get update && apt-get install -y \
    cron \
    && rm -rf /var/lib/apt/lists/*

COPY backup.sh /backup.sh
COPY crontab /etc/cron.d/backup-cron.template
RUN chmod 0644 /etc/cron.d/backup-cron.template && \
    chmod +x /backup.sh

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["cron", "-f"]