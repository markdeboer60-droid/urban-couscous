/**
 * /portal/[token] — public client portal page.
 * No authentication required; access is gated by the one-time token.
 */

import { PortaalClient } from "./PortaalClient";

export default function PortaalPage({ params }: { params: { token: string } }) {
  return <PortaalClient token={params.token} />;
}
