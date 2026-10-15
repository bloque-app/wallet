import { createFileRoute } from '@tanstack/react-router';
import { LatamRailFlow } from '~/components/latam-rail-flow';

export const Route = createFileRoute('/_authed/topup/spei/')({
  component: () => <LatamRailFlow rail="spei" direction="topup" />,
});
