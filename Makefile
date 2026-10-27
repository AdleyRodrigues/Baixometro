COMPOSE = docker compose -f infra/docker-compose.yml --env-file .env

.PHONY: dev up down logs shell-api psql clean

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
