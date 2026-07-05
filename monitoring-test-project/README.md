## Содержание репозитория
- [Backend](#Backend-приложение)
- [Frontend](#Frontend-приложение)
- [База данных](#База-данных)
- [Deploy Pipeline ](#Deploy-Pipeline)
- [Конфигурация Nginx](#Конфигурация-Nginx)
- [Docker Compose](#Docker-compose)
## Backend-приложение
**Технологический стек:** Node.js 22-alpine, Express.js, Prisma ORM, MySQL, PM2.
**Пользователь запуска:** node (uid: 1000, gid: 1000)
##### Dockerfile описание:
Используется Multi-stage build для оптимизации размера образа.

**Первый этап (builder):**
```dockerfile
FROM node:22-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
```
На этом этапе формируется слой с установленными зависимостями. Используется slim образ node:22-alpine для минимизации размера. Копируются package.json и package-lock.json, затем выполняется npm install для установки всех зависимостей приложения.

**Второй этап (финальный образ):**
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm install -g pm2
RUN apk add --no-cache openssl
```
Создаётся новый чистый образ. Из builder stage копируются node_modules для полного переиспользования слоя зависимостей. Копируется весь исходный код приложения. Глобально устанавливается PM2 для управления процессами и openssl через apk package manager для работы с криптографией.

**Подготовка логов и генерация Prisma Client:**
```dockerfile
RUN mkdir -p logs && chown -R node:node logs
RUN npx prisma generate
```
Создаётся директория logs для хранения логов приложения с правами собственности на пользователя node. С помощью npx prisma generate генерируется Prisma Client для работы с базой данных.

**Безопасность, порт и запуск:**
```dockerfile
USER node
EXPOSE 3001
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
```

Контекст выполнения переключается на пользователя node (не root) по соображениям безопасности. Открывается порт 3001 для прослушивания входящих запросов. Контейнер запускается с командой pm2-runtime, которая запускает приложение через экосистему, определённую в ecosystem.config.js в production окружении.
## Frontend-приложение
**Технологический стек:** React 18, Vite 7, Node.js 24-alpine (build stage), Alpine 3 (runtime stage).
**Пользователь запуска:** root (uid: 0, gid: 0)

**Dockerfile описание:**
Используется Multi-stage build: отдельный этап сборки и отдельный финальный этап с артефактами.

**Первый этап (build):**
```dockerfile
FROM node:24-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build
```
На этапе build поднимается Node.js окружение, устанавливаются зависимости, копируется код фронтенда и выполняется production-сборка через `npm run build`. Аргумент `REACT_APP_API_URL` передаётся на этапе сборки и становится переменной окружения внутри образа.

**Второй этап (runtime):**
```dockerfile
FROM alpine:3
WORKDIR /app
COPY --chown=nginx:nginx --from=build /app/dist /app/dist
CMD ["sh", "-c", "echo 'Build ready in /app/dist'"]
```
Финальный образ минимальный, на базе Alpine. В него копируется только директория `dist` из build-этапа. Через `--chown=nginx:nginx` выставляется владелец файлов сборки. Команда запуска здесь служебная: контейнер сообщает, что артефакты готовы в `/app/dist`.
## База-данных
**Технологический стек:** MySQL 8.0 (кастомный образ на базе `mysql:8.0`).
**Пользователь запуска:** mysql (uid: 999, gid: 999)
##### Dockerfile описание:
```dockerfile
FROM mysql:8.0
USER root
RUN mkdir -p /var/lib/mysql /var/run/mysqld  /var/log/mysql\
 && chown -R mysql:mysql /var/lib/mysql /var/run/mysqld /var/log/mysql
COPY ./my.cnf /etc/mysql/conf.d/my.cnf
RUN chmod 644 /etc/mysql/conf.d/my.cnf
USER mysql
```

Базовый образ MySQL расширяется дополнительной подготовкой директорий данных, runtime-сокета и логов. Для этого временно используется root, после чего владельцем назначается пользователь `mysql:mysql`, чтобы сервис мог писать данные и логи без повышенных прав. Файл конфигурации `my.cnf` копируется в `/etc/mysql/conf.d/` и получает права чтения `644`. В конце выполнение возвращается к пользователю `mysql`.
##### Подробное описание `my.cnf`:
```ini
[mysqld]
log_error=/var/log/mysql/error.log

general_log=ON
general_log_file=/var/log/mysql/general.log

slow_query_log=ON
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=1.0
```

**Конфиг включает расширенное логирование работы сервера MySQL:**
- `log_error=/var/log/mysql/error.log`: путь к файлу ошибок сервера (ошибки запуска, runtime-ошибки, диагностические записи).
- `general_log=ON`: включение общего журнала всех входящих SQL-команд.
- `general_log_file=/var/log/mysql/general.log`: путь к файлу общего журнала.
- `slow_query_log=ON`: включение журнала медленных запросов.
- `slow_query_log_file=/var/log/mysql/slow.log`: путь к файлу медленных запросов.
- `long_query_time=1.0`: порог медленного запроса в секундах; всё, что выполняется дольше 1 секунды, попадает в slow log.
## Deploy-Pipeline
**Раннер:** GitLab Runner с тегом `docker-monitoring`, jobs выполняются в Docker executor (по `.gitlab-ci.yml` используются образы `docker:cli` и `alpine:latest`).
##### Развёртывание раннера на сервере в Docker-контейнере:
```bash
docker run -d --name gitlab-runner --restart always \
  -v /srv/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gitlab/gitlab-runner:latest
```
##### Действия для запуска раннера:
```bash
docker exec -it gitlab-runner gitlab-runner register
```

Во время регистрации указываются URL GitLab, registration token проекта, executor `docker`, базовый image (например `docker:cli`) и тег `docker-monitoring`.
Пример конфигурации config.toml:
```toml
concurrent = 3
check_interval = 1
connection_max_age = "15m0s"
shutdown_timeout = 1

[session_server]
  session_timeout = 1800

[[runners]]
  name = "docker-monitoring"
  request_concurrency = 3
  url = "https://gitlab.com"
  id = 5037092
  token = ""
  token_obtained_at = 2025-10-31T20:14:59Z
  token_expires_at = 0001-01-01T00:00:00Z
  executor = "docker"
  [runners.cache]
    MaxUploadedArchiveSize = 0
    [runners.cache.s3]
    [runners.cache.gcs]
    [runners.cache.azure]
  [runners.docker]
    tls_verify = false
    image = "docker:latest"
    privileged = true
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]
    shm_size = 0
    network_mtu = 0
```

##### Подробное описание пайплайна:

Пайплайн состоит из стадий `build`, `push`, `deploy`.

`before_script`:
- Выполняется логин в Container Registry через `docker login` с переменными CI (`CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `CI_REGISTRY`).

`build` (stage: build):
- Используется образ `docker:cli`.
- Выполняется `docker-compose --env-file /dev/null -f docker-compose.prod.yml build`.
- Собираются образы сервисов для production-compose.
- Job запускается на раннере с тегом `docker-monitoring`.

`push` (stage: push):
- Используется образ `docker:cli`.
- Выполняется `docker-compose --env-file /dev/null -f docker-compose.prod.yml push`.
- Собранные образы публикуются в Container Registry.
- Job также привязан к тегу `docker-monitoring`.

`deploy` (stage: deploy, only: main):
- Используется образ `alpine:latest`.
- Перед выполнением устанавливается `openssh-client`, поднимается `ssh-agent`, добавляется приватный ключ из переменной `SSH_KEY`.
- Генерируется `.env` файл из CI/CD переменных (БД, приложение, registry-теги).
- По `scp` на сервер копируются `.env` и `docker-compose.prod.yml` в `/home/$SERVER_USER/monitoring`.
- По `ssh` выполняется деплой-цепочка:
  1. `docker compose pull`
  2. `docker compose up -d db`
  3. ожидание `sleep 30` для поднятия базы данных
  4. `docker compose run --rm backend npx prisma migrate deploy` выполняется миграция 
  5. `docker compose up -d`
  6. очистка неиспользуемых образов (`docker image prune`)

В результате на `main` ветке выполняется полный цикл: сборка, публикация образов и обновление окружения на сервере.
## Конфигурация-Nginx
Конфигурация `nginix.conf` поднимает один HTTP-сервер на 80 порту, который одновременно раздаёт frontend-статику и проксирует backend API.
```nginx
user nginx;
worker_processes auto;

events {
	worker_connections 1024;
}
```

- `user nginx`: воркеры Nginx работают от пользователя `nginx`.
- `worker_processes auto`: число worker-процессов подбирается автоматически по CPU.
- `worker_connections 1024`: лимит одновременных соединений на worker.

```nginx
http {
	log_format main '$remote_addr - $remote_user [$time_local] '
					'"$request" $status $body_bytes_sent '
					'$request_time';

	access_log /var/log/nginx/access.log main;
	error_log  /var/log/nginx/error.log warn;
```
- Определён кастомный формат access-логов `main`: IP клиента, время, запрос, HTTP-статус, объём ответа, время обработки.
- `access_log` пишет в `/var/log/nginx/access.log`.
- `error_log` пишет предупреждения и ошибки в `/var/log/nginx/error.log`.

```nginx
	server {
		listen 80;
		server_name 31.129.108.115;
```
- `listen 80`: приём HTTP-трафика.
- `server_name 31.129.108.115`: привязка к IP хоста.

```nginx
		location / {
			root /var/www/monitoring/frontend_build;
			index index.html;
			try_files $uri $uri/ /index.html;
		}
```

- Корневой location раздаёт SPA-сборку из `/var/www/monitoring/frontend_build`.
- `try_files ... /index.html` обеспечивает корректную работу client-side роутинга React (fallback на `index.html`).

```nginx
		location /api/ {
			proxy_pass http://127.0.0.1:3001/api/;
			proxy_set_header Host $host;
			proxy_set_header X-Real-IP $remote_addr;
			proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
			proxy_set_header X-Forwarded-Proto $scheme;
		}
```

- Все запросы `/api/` проксируются на backend `127.0.0.1:3001`.
- Заголовки `X-Real-IP` и `X-Forwarded-*` сохраняют оригинальный IP клиента и протокол для корректного логирования и обработки на backend.

```nginx
		include /etc/nginx/mime.types;
		default_type application/octet-stream;
	}
}
```
- Подключаются MIME-типы для корректной отдачи статики.
- `default_type application/octet-stream` задаёт тип по умолчанию для неизвестных расширений.

## Docker-compose
В проекте используются два compose-файла: `docker-compose.yml` (локальный/базовый) и `docker-compose.prod.yml` (production + CI/CD registry-теги).

##### Описание `docker-compose.yml`
Блок `db`:
- Сборка из `./mysql`, контейнер `monitoring_db`.
- Ограничения ресурсов: `mem_limit: 700m`, `cpus: "0.5"`.
- Передаются переменные `MYSQL_*`.
- Тома: именованный `db_data:/var/lib/mysql` для данных БД и bind `/var/log/mysql:/var/log/mysql` для логов.
- Публикация порта `${DB_PORT}:3306`.
- Healthcheck через `mysqladmin ping`.
- Сетевая привязка: `app_net`.
- Безопасность: `cap_drop: ALL` (сброс Linux capabilities).

Блок `backend`:
- Сборка из `./backend`, контейнер `monitoring_backend`.
- Ограничения ресурсов: `150m`, `0.3 CPU`.
- Переменные окружения приложения и `DATABASE_URL`.
- `depends_on` с условием `service_healthy` для `db`.
- Публикация `${PORT}:${PORT}`.
- Том логов PM2: `/var/log/pm2:/app/logs`.
- Сеть: `app_net`.

Блок `frontend_build`:
- Сборка из `./frontend`, контейнер `monitoring_frontend`.
- Ограничения ресурсов: `100m`, `0.2 CPU`.
- Копирование артефактов сборки в bind-том `./../frontend_build:/build_out`.
- Команда контейнера копирует `/app/dist` в `/build_out`.

Блок `volumes`:
- `db_data` - именованный том для персистентного хранения данных MySQL.

Блок `networks`:
- `app_net` - общая сеть для взаимодействия `db` и `backend`.
##### Описание `docker-compose.prod.yml`

Блок `db`:
- Образ тегируется и публикуется как `${CI_REGISTRY_IMAGE}/mysql:${CI_COMMIT_REF_SLUG}`.
- Ограничения ресурсов, переменные и healthcheck аналогичны базовому compose.
- Порт публикуется только на loopback: `127.0.0.1:${DB_PORT}:3306`.
- Логи и данные вынесены в bind/volume тома как в базовой версии.
- Безопасность: `cap_drop: ALL`, добавлена группа `adm` через `group_add` для доступа к логам.

Блок `backend`:
- Образ `${CI_REGISTRY_IMAGE}/backend:${CI_COMMIT_REF_SLUG}`.
- Порт только на loopback: `127.0.0.1:${PORT}:${PORT}`.
- Безопасность: `cap_drop: ALL`, `security_opt: no-new-privileges=true`, `group_add: adm`.
- Сеть, env и зависимости на `db` сохранены.
- Логи PM2 пишутся в `/var/log/pm2:/app/logs`.

Блок `frontend_build`:
- Образ `${CI_REGISTRY_IMAGE}/frontend:${CI_COMMIT_REF_SLUG}`.
- На этапе build передаётся `VITE_API_URL` через `args`.
- Артефакты копируются в `/var/www/monitoring/frontend_build` для отдачи Nginx.

Блок `volumes`:
- `db_data` - персистентный том БД.

Блок `networks`:
- `app_net` - единая внутренняя сеть сервисов.

##### Сводно по безопасности в compose:
- Сброс capabilities (`cap_drop: ALL`) для БД и backend.
- Запрет эскалации привилегий в backend (`no-new-privileges=true`).
- Привязка сервисных портов к `127.0.0.1` в production-compose.
- Разделение сервисов в отдельной сети `app_net`.




