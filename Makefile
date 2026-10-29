COMPOSE = docker compose -f infra/docker-compose.yml --env-file .env
COMPOSE_PROD = docker compose -f infra/docker-compose.prod.yml

.PHONY: dev up down logs shell-api psql clean prod-up prod-down

dev:
	$(COMPOSE) up --build

up:
	$(COMPOSE) up -d $(s)

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

shell-api:
	$(COMPOSE) exec api bash

psql:
	$(COMPOSE) exec postgres psql -U baixometro -d baixometro

clean:
	$(COMPOSE) down -v --remove-orphans

prod-up:
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down
