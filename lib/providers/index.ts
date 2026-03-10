import { bestbetConnector } from "./bestbet";
import { ggpokerConnector } from "./ggpoker";
import { pokerstarsConnector } from "./pokerstars";
import { poker888Connector } from "./888poker";
import { pokeratlasConnector } from "./pokeratlas";
import { wsopConnector } from "./wsop";
import { partypokerConnector } from "./partypoker";
import { wptglobalConnector } from "./wptglobal";
import { localVmConnector } from "./local-vm";
import type { ProviderConnector } from "./types";

export const providerRegistry: ProviderConnector[] = [
  // Primary: Local VM connector (reads from authenticated poker clients)
  localVmConnector,

  // Fallback: Web scrapers (limited/unreliable without auth)
  ggpokerConnector,
  pokerstarsConnector,
  poker888Connector,
  wsopConnector,
  partypokerConnector,
  wptglobalConnector,

  // IRL providers (public data)
  bestbetConnector,
  pokeratlasConnector,
];

// Export individual connectors for selective use
export {
  bestbetConnector,
  ggpokerConnector,
  pokerstarsConnector,
  poker888Connector,
  pokeratlasConnector,
  wsopConnector,
  partypokerConnector,
  wptglobalConnector,
  localVmConnector,
};
