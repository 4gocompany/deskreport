import { createAuthClient } from 'better-auth/react';
import { organizationClient, adminClient } from 'better-auth/client/plugins';
import { apiBase } from '../api/fetcher';

export const authClient = createAuthClient({
  baseURL: apiBase,
  plugins: [adminClient(), organizationClient()],
  organization: {
    additionalFields: {
      metadata: {
        type: 'string',
        required: false,
      },
    },
  },
});

export const { signIn, signUp, useSession, useActiveOrganization: useOrganization } = authClient;
