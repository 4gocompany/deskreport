import { useParams } from 'react-router-dom';

/**
 * Hook to manage the current tenant (company and project) context.
 * Useful for building dynamic routes and fetching tenant-specific data.
 */
export function useTenant() {
    const { company_id, project_id } = useParams();

    // Default values to avoid broken links if parameters are missing
    const cId = company_id;
    const pId = project_id;

    /**
     * Builds a URL within the current company context.
     */
    const companyUrl = (path: string) => `/${cId}/${path.startsWith('/') ? path.slice(1) : path}`;

    /**
     * Builds a URL within the current project context (company + project).
     */
    const projectUrl = (path: string) => `/${cId}/${pId}/${path.startsWith('/') ? path.slice(1) : path}`;

    return {
        company_id: cId,
        project_id: pId,
        companyUrl,
        projectUrl,
    };
}
