import { bestbetConnector } from "./bestbet";
import { ggpokerConnector } from "./ggpoker";
import { pokerstarsConnector } from "./pokerstars";
import { poker888Connector } from "./888poker";
import { pokeratlasConnector } from "./pokeratlas";
import { wsopConnector } from "./wsop";
import { partypokerConnector } from "./partypoker";
import { wptglobalConnector } from "./wptglobal";
import type { ProviderConnector } from "./types";

export const providerRegistry: ProviderConnector[] = [
  // Online providers
  ggpokerConnector,
  pokerstarsConnector,
  poker888Connector,
  wsopConnector,
  partypokerConnector,
  wptglobalConnector,

  // IRL providers
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
};
