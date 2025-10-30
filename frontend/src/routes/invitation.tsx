import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InvitationPage } from '../feature/invitation/page/InvitationPage';

// Define required search params
const invitationSearchSchema = z.object({
  inviteCode: z.string(),
});

export const Route = createFileRoute('/invitation')({
  validateSearch: invitationSearchSchema,
  // No beforeLoad protection - allow unauthenticated access
  // User will be signed in when they click "Accept"
  component: InvitationPage,
});
