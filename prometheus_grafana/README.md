## Содержание репозитория
- [Prometheus-сервис](#prometheus-сервис)
- [Grafana-сервис](#grafana-сервис)
- [Описание env](#описание-env)

## Prometheus-сервис
**Технологический стек:** Prometheus v3.8.0.
**Назначение:** сбор и хранение метрик мониторинга.
**Пользователь запуска:** `nobody` (uid: 65534, gid: 65534) - пользователь по умолчанию образа `prom/prometheus:v3.8.0`.


- Используется официальный образ Prometheus `prom/prometheus:v3.8.0`.
- Конфигурация монтируется из локальной директории `./prometheus` в `/etc/prometheus/`.
- Данные TSDB сохраняются в именованный том `prometheus_data`.
- В команду запуска явно передаётся путь к конфигу `--config.file=/etc/prometheus/prometheus.yml`.
- Порт Prometheus публикуется только на loopback интерфейс хоста: `127.0.0.1:${PROMETHEUS_PORT}:9090`.
- Добавлены базовые меры hardening: `cap_drop: ALL` и `no-new-privileges=true`.

## Grafana-сервис
**Технологический стек:** Grafana v12.4.0.
**Назначение:** визуализация метрик из Prometheus и управление дашбордами.
**Пользователь запуска:** `grafana` (uid: 472, gid:0) - пользователь по умолчанию образа `grafana/grafana:12.4.0`.

- Используется официальный образ Grafana `grafana/grafana:12.4.0`.
- Логин администратора и пароль задаются через переменные `ADMIN_USER` и `ADMIN_PASSWORD` из файла `.env`.
- Регистрация пользователей отключена параметром `GF_USERS_ALLOW_SIGN_UP=false`.
- Хранилище Grafana вынесено в том `grafana_data`.
- Provisioning-конфигурация (datasources и другие автоконфиги) монтируется из `./grafana/provisioning`.
- Сервис запускается после Prometheus через `depends_on`.

## Описание-env
- `ADMIN_USER` — логин администратора Grafana (пробрасывается в `GF_SECURITY_ADMIN_USER`).
- `ADMIN_PASSWORD` — пароль администратора Grafana (пробрасывается в `GF_SECURITY_ADMIN_PASSWORD`).
- `GRAFANA_PORT` — порт хоста для публикации веб-интерфейса Grafana (`${GRAFANA_PORT}:3000`).
- `PROMETHEUS_PORT` — порт хоста для публикации Prometheus (`127.0.0.1:${PROMETHEUS_PORT}:9090`).
- `PROMETHEUS_HOST` — имя хоста Prometheus внутри Docker-сети (используется для формирования URL).
- `PROMETHEUS_URL` — URL Prometheus для datasource Grafana; собирается из `PROMETHEUS_HOST` и `PROMETHEUS_PORT`.
- `PROMETHEUS_UID` — уникальный идентификатор datasource Prometheus в Grafana