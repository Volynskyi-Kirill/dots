.PHONY: up down restart logs test build prod-up prod-down prod-logs prod-build rebuild-frontend

# ----- Development Commands -----
up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

build:
	docker-compose build

rebuild-frontend:
	docker-compose rm -f -s -v frontend
	docker-compose build frontend
	docker-compose up -d frontend

test:
	cd backend && go test -v ./...

# ----- Production Commands -----
prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-build:
	docker-compose -f docker-compose.prod.yml build

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f
