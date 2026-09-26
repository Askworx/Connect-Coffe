FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o connect-bot .

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/connect-bot .
COPY --from=builder /app/migration.sql .

EXPOSE 8090

CMD ["./connect-bot"]
