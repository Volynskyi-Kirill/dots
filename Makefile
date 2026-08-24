.PHONY: up down restart build test logs share

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

share:
	ngrok http 5173
