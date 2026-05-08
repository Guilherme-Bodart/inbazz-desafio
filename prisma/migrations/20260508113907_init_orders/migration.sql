-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'ENRICHED', 'FAILED_ENRICHMENT');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "external_order_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "enriched_amount" DECIMAL(12,2),
    "enriched_currency" TEXT,
    "enrichment_payload" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_external_order_id_idx" ON "orders"("external_order_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
