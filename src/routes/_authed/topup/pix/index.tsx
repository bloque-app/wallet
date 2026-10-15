import { createFileRoute } from '@tanstack/react-router';
import { LatamRailFlow } from '~/components/latam-rail-flow';

export const Route = createFileRoute('/_authed/topup/pix/')({
  component: () => <LatamRailFlow rail="pix" direction="topup" />,
});
