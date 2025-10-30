import { Route } from '@/routes/invitation';
import { InvitationContainer } from '../container/InvitationContainer';

export function InvitationPage() {
  const params = Route.useSearch();

  return <InvitationContainer inviteCode={params.inviteCode} />;
}
