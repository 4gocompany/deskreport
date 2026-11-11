-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "machine_id" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "remote" TEXT,
ADD COLUMN "default_machine_id" TEXT;

-- AlterTable
ALTER TABLE "agent_machines" ADD COLUMN "folders" JSONB;

-- AlterTable
ALTER TABLE "project_environments" ADD COLUMN "machine_id" TEXT;

-- CreateTable
CREATE TABLE "project_locations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "remote" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_organization_id_remote_idx" ON "projects"("organization_id", "remote");

-- CreateIndex
CREATE INDEX "project_locations_machine_id_idx" ON "project_locations"("machine_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_locations_project_id_machine_id_key" ON "project_locations"("project_id", "machine_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_default_machine_id_fkey" FOREIGN KEY ("default_machine_id") REFERENCES "agent_machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_locations" ADD CONSTRAINT "project_locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_locations" ADD CONSTRAINT "project_locations_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "agent_machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "agent_machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
