import { createFileRoute } from '@tanstack/react-router';
import { LatamRailFlow } from '~/components/latam-rail-flow';

export const Route = createFileRoute('/_authed/send/spei/')({
  component: () => <LatamRailFlow rail="spei" direction="send" />,
});
