-- CreateEnum
CREATE TYPE "LanDhcpStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "LanQosLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "InterfaceType" AS ENUM ('ETHERNET', 'WIFI_AP', 'WIFI_MANAGED', 'LTE', 'LINK_EXTENDER', 'EXTENDER');

-- CreateTable
CREATE TABLE "Lan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lanId" TEXT NOT NULL,
    "lanName" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "subnetmask" TEXT NOT NULL,
    "dns1" TEXT,
    "dns2" TEXT,
    "dhcp" "LanDhcpStatus" NOT NULL DEFAULT 'ENABLED',
    "dhcpRangeFrom" TEXT,
    "dhcpRangeTo" TEXT,
    "allowGateway" BOOLEAN NOT NULL DEFAULT true,
    "captivePortal" BOOLEAN NOT NULL DEFAULT false,
    "qos" "LanQosLevel" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "Lan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanInterface" (
    "id" TEXT NOT NULL,
    "lanId" TEXT NOT NULL,
    "interfaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanInterface_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkInterface" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "interfaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "type" "InterfaceType" NOT NULL,
    "port" INTEGER NOT NULL,
    "vlanId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NetworkInterface_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lan_lanId_key" ON "Lan"("lanId");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkInterface_interfaceId_key" ON "NetworkInterface"("interfaceId");

-- AddForeignKey
ALTER TABLE "LanInterface" ADD CONSTRAINT "LanInterface_lanId_fkey" FOREIGN KEY ("lanId") REFERENCES "Lan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanInterface" ADD CONSTRAINT "LanInterface_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "NetworkInterface"("interfaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
