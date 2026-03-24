import { PRESET_TOKENS, type TokenConfig } from "@/lib/tokens";

export type MarketAgentInstance = {
  homePosition: [number, number, number];
  id: string;
  mint: string;
  primary?: boolean;
  symbol: string;
};

const CUSTOM_AGENT_SLOTS: Array<[number, number, number]> = [
  [-7.6, 0, -1.1],
  [-6.9, 0, 5.1],
  [-2.6, 0, 7.6],
  [3.1, 0, 7.4],
  [7.1, 0, 4.8],
  [7.8, 0, -0.7],
  [5.4, 0, -6.8],
  [-0.8, 0, -7.9],
  [-5.8, 0, -6.5],
] as const;

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function round(value: number) {
  return Number(value.toFixed(1));
}

function buildPresetAgentInstances() {
  const total = PRESET_TOKENS.length;

  return PRESET_TOKENS.map((token, index) => {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    const radius = index % 2 === 0 ? 6.3 : 5.4;

    return {
      id: `preset-${token.symbol.toLowerCase()}`,
      mint: token.mint,
      symbol: token.symbol,
      primary: true,
      homePosition: [round(Math.cos(angle) * radius), 0, round(Math.sin(angle) * radius)],
    } satisfies MarketAgentInstance;
  });
}

function buildCustomAgentInstances(tokens: TokenConfig[]) {
  const customTokens = tokens
    .filter((token) => !token.isPreset)
    .slice()
    .sort((left, right) => left.mint.localeCompare(right.mint));
  const usedSlots = new Set<number>();

  return customTokens.map((token) => {
    const seed = hashString(token.mint);
    let slotIndex = seed % CUSTOM_AGENT_SLOTS.length;

    while (usedSlots.has(slotIndex)) {
      slotIndex = (slotIndex + 1) % CUSTOM_AGENT_SLOTS.length;
    }

    usedSlots.add(slotIndex);

    return {
      id: `custom-${token.mint}`,
      mint: token.mint,
      symbol: token.symbol,
      primary: true,
      homePosition: CUSTOM_AGENT_SLOTS[slotIndex],
    } satisfies MarketAgentInstance;
  });
}

export function buildMarketAgents(tokens: TokenConfig[]) {
  return [...buildPresetAgentInstances(), ...buildCustomAgentInstances(tokens)];
}

export function getPrimaryHomePosition(
  agents: MarketAgentInstance[],
  mint: string,
) {
  return agents.find((agent) => agent.mint === mint && agent.primary)?.homePosition ?? [0, 0, 0];
}
