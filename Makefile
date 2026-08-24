.PHONY: up down restart build test logs

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose down && docker-compose up -d

build:
	docker-compose build

logs:
	docker-compose logs -f

test:
	cd backend && go test -v ./...
