# Dockerfile for Go backend
# Local development using air for live reloading
FROM golang:alpine

WORKDIR /app

# Install air for hot reload
RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Run air
CMD ["air", "-c", ".air.toml"]
