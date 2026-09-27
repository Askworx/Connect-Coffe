FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o connect-bot .

FROM alpine:3.19

# The scheduler fires offers in Asia/Kolkata; without tzdata it falls back to UTC.
RUN apk add --no-cache tzdata

WORKDIR /app

COPY --from=builder /app/connect-bot .
COPY --from=builder /app/migration.sql .
COPY --from=builder /app/seed-uploads ./seed-uploads

EXPOSE 8090

CMD ["./connect-bot"]
