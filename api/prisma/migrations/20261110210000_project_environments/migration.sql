-- AlterTable
ALTER TABLE "projects" ADD COLUMN "auto_commit_after_qa" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "project_environments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "health_url" TEXT,
    "start_command" TEXT,
    "qa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_environments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_environments_project_id_idx" ON "project_environments"("project_id");

-- AddForeignKey
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
