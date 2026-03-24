"use client";

import { ContactShadows, Sparkles } from "@react-three/drei";
import { Agent } from "@/components/immersive/Agent";
import { buildMarketAgents } from "@/components/immersive/marketAgents";
import { type SwapFlowPhase, type SwapQuote } from "@/lib/mockSwap";
import { type TokenConfig } from "@/lib/tokens";

type AgentManagerProps = {
  amount: string;
  availableTokens: TokenConfig[];
  darkMode: boolean;
  fromToken: TokenConfig;
  phase: SwapFlowPhase;
  quote: SwapQuote | null;
  selectedMints: string[];
  sequenceId: number;
  toToken: TokenConfig;
};

type AgentSceneTheme = {
  floor: string;
  idleHalo: string;
  idleMarker: string;
  idlePedestal: string;
  shadow: string;
  sparkles: string;
};

function getAgentSceneTheme(darkMode: boolean): AgentSceneTheme {
  if (darkMode) {
    return {
      floor: "#091017",
      idleHalo: "#14222f",
      idleMarker: "#08111a",
      idlePedestal: "#101823",
      shadow: "#030507",
      sparkles: "#87dfff",
    };
  }

  return {
    floor: "#dbe8f5",
    idleHalo: "#bad3ee",
    idleMarker: "#b2cbe3",
    idlePedestal: "#c8d9ea",
    shadow: "#8ea4be",
    sparkles: "#6db7ff",
  };
}

export function AgentManager({
  amount,
  availableTokens,
  darkMode,
  fromToken,
  phase,
  quote,
  selectedMints,
  sequenceId,
  toToken,
}: AgentManagerProps) {
  const marketAgents = buildMarketAgents(availableTokens);
  const theme = getAgentSceneTheme(darkMode);

  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[11.5, 80]} />
        <meshStandardMaterial color={theme.floor} roughness={0.96} metalness={0.08} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.2, 1.85, 64]} />
        <meshBasicMaterial color="#8fdfff" opacity={0.24} transparent />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[4.8, 5.6, 96]} />
        <meshBasicMaterial color="#28455d" opacity={0.26} transparent />
      </mesh>

      {marketAgents.map((agentInstance) => {
        const token = availableTokens.find((item) => item.mint === agentInstance.mint);

        if (!token) {
          return null;
        }

        const role =
          agentInstance.primary && agentInstance.mint === fromToken.mint
            ? "from"
            : agentInstance.primary && agentInstance.mint === toToken.mint
              ? "to"
              : null;

        return (
          <group key={agentInstance.id}>
            <mesh
              castShadow
              position={[
                agentInstance.homePosition[0],
                0.42,
                agentInstance.homePosition[2],
              ]}
            >
              <cylinderGeometry args={[0.46, 0.56, 0.84, 6]} />
              <meshStandardMaterial
                color={theme.idlePedestal}
                emissive={role ? token.visual.emissive : theme.idleMarker}
                emissiveIntensity={role ? 0.14 : 0.03}
                metalness={0.42}
                roughness={0.42}
              />
            </mesh>
            <mesh
              castShadow
              position={[
                agentInstance.homePosition[0],
                1.18,
                agentInstance.homePosition[2],
              ]}
            >
              <boxGeometry args={[0.3, 0.12, 0.3]} />
              <meshStandardMaterial color={token.visual.secondary} metalness={0.52} roughness={0.26} />
            </mesh>
            <mesh
              position={[
                agentInstance.homePosition[0],
                0.02,
                agentInstance.homePosition[2],
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[1.05, 48]} />
              <meshBasicMaterial
                color={selectedMints.includes(agentInstance.mint) ? token.visual.glow : theme.idleHalo}
                opacity={selectedMints.includes(agentInstance.mint) ? 0.2 : 0.08}
                transparent
              />
            </mesh>
            <Agent
              counterpartyToken={role === "from" ? toToken : role === "to" ? fromToken : null}
              darkMode={darkMode}
              homePosition={agentInstance.homePosition}
              inputAmount={amount}
              phase={phase}
              quote={quote}
              role={role}
              sequenceId={sequenceId}
              selected={role !== null}
              token={token}
            />
          </group>
        );
      })}

      <Sparkles
        color={theme.sparkles}
        count={48}
        opacity={0.4}
        scale={[16, 7, 16]}
        size={2.4}
        speed={0.14}
      />
      <ContactShadows
        blur={2.6}
        color={theme.shadow}
        far={12}
        opacity={0.5}
        position={[0, -0.01, 0]}
        resolution={1024}
        scale={18}
      />
    </>
  );
}
