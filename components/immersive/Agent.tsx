"use client";

import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TokenCase } from "@/components/immersive/TokenCase";
import { OverlayAssetBadge } from "@/components/scene/AssetBadge";
import { LIVE_SWAP_SCENE_DURATIONS, type SwapFlowPhase, type SwapQuote } from "@/lib/mockSwap";
import { type TokenConfig } from "@/lib/tokens";

const APPROACH_TABLE_DURATION = 860;

type AgentProps = {
  counterpartyToken: TokenConfig | null;
  darkMode: boolean;
  homePosition: [number, number, number];
  inputAmount: string;
  phase: SwapFlowPhase;
  quote: SwapQuote | null;
  role: "from" | "to" | null;
  sequenceId: number;
  selected: boolean;
  token: TokenConfig;
};

type SpeechBubbleProps = {
  darkMode: boolean;
  logoUri?: string | null;
  mode: "buy" | "sell";
  symbol: string;
  valueLabel: string;
};

type AgentTheme = {
  bubbleBack: string;
  idleHalo: string;
  idleLabel: string;
  outline: string;
};

function getAgentTheme(darkMode: boolean): AgentTheme {
  if (darkMode) {
    return {
      bubbleBack: "#091119",
      idleHalo: "#223447",
      idleLabel: "#dceaff",
      outline: "#03070b",
    };
  }

  return {
    bubbleBack: "#f5fbff",
    idleHalo: "#b4cde7",
    idleLabel: "#35506f",
    outline: "#f6fbff",
  };
}

function getExchangeTarget(role: "from" | "to" | null): [number, number, number] {
  if (role === "from") {
    return [-1.55, 0, 0.28];
  }

  if (role === "to") {
    return [1.55, 0, -0.28];
  }

  return [0, 0, 0];
}

function formatBubbleAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "--";
  }

  if (amount >= 1_000_000_000) {
    const compact = amount / 1_000_000_000;
    return `${Number(compact.toFixed(compact >= 10 ? 0 : 1))}b`;
  }

  if (amount >= 1_000_000) {
    const compact = amount / 1_000_000;
    return `${Number(compact.toFixed(compact >= 10 ? 0 : 1))}m`;
  }

  if (amount >= 1_000) {
    const compact = amount / 1_000;
    return `${Number(compact.toFixed(compact >= 10 ? 0 : 1))}k`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(amount);
}

function SpeechBubble({
  darkMode,
  logoUri,
  mode,
  symbol,
  valueLabel,
}: SpeechBubbleProps) {
  const theme = getAgentTheme(darkMode);
  const washColor = mode === "buy" ? "#10251d" : "#2b1317";
  const frameColor = mode === "buy" ? "#69efb3" : "#ff6b7d";
  const panelColor = darkMode ? theme.bubbleBack : "#f8fbff";
  const textColor = darkMode ? "#f2fbff" : "#173047";

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false} position={[0, 2.72, 0]}>
      <group>
        <mesh position={[0.18, 0, -0.02]}>
          <planeGeometry args={[0.94, 0.42]} />
          <meshBasicMaterial color={panelColor} opacity={darkMode ? 0.95 : 0.82} transparent />
        </mesh>
        <mesh position={[-0.29, 0, -0.015]}>
          <circleGeometry args={[0.24, 44]} />
          <meshBasicMaterial color={panelColor} opacity={darkMode ? 0.95 : 0.82} transparent />
        </mesh>
        <mesh position={[0.18, 0, -0.01]}>
          <planeGeometry args={[1, 0.48]} />
          <meshBasicMaterial color={frameColor} opacity={darkMode ? 0.18 : 0.12} transparent />
        </mesh>
        <mesh position={[-0.29, 0, -0.01]}>
          <circleGeometry args={[0.27, 44]} />
          <meshBasicMaterial color={frameColor} opacity={darkMode ? 0.2 : 0.14} transparent />
        </mesh>
        <mesh position={[0.64, 0, -0.01]}>
          <circleGeometry args={[0.24, 44]} />
          <meshBasicMaterial color={frameColor} opacity={darkMode ? 0.2 : 0.14} transparent />
        </mesh>
        <mesh position={[0.18, 0, 0.004]}>
          <planeGeometry args={[0.9, 0.36]} />
          <meshBasicMaterial color={washColor} opacity={darkMode ? 0.7 : 0.18} transparent />
        </mesh>
        <mesh position={[-0.29, 0, 0.004]}>
          <circleGeometry args={[0.21, 44]} />
          <meshBasicMaterial color={washColor} opacity={darkMode ? 0.72 : 0.2} transparent />
        </mesh>
        <OverlayAssetBadge
          accent={frameColor}
          label={symbol}
          logoUri={logoUri}
          position={[-0.29, 0, 0.02]}
          size={32}
          textColor="#f2fbff"
        />
        <Text
          anchorX="center"
          anchorY="middle"
          color={textColor}
          fontSize={0.17}
          maxWidth={0.62}
          outlineColor={theme.outline}
          outlineWidth={0.016}
          position={[0.22, 0, 0.02]}
        >
          {valueLabel}
        </Text>
      </group>
    </Billboard>
  );
}

export function Agent({
  counterpartyToken,
  darkMode,
  homePosition,
  inputAmount,
  phase,
  quote,
  role,
  sequenceId,
  selected,
  token,
}: AgentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const carryRef = useRef<THREE.Group>(null);
  const ownCarryRef = useRef<THREE.Group>(null);
  const counterpartyCarryRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const phaseStartedAt = useRef(0);
  const seed = useMemo(
    () => token.symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0),
    [token.symbol],
  );
  const theme = useMemo(() => getAgentTheme(darkMode), [darkMode]);
  const showBubble =
    role !== null &&
    (phase === "ready" || phase === "signing");
  const bubbleMode = role === "from" ? "sell" : "buy";
  const bubbleValueLabel = useMemo(() => {
    if (role === "from") {
      const numericAmount = Number(inputAmount);

      if (Number.isFinite(numericAmount) && numericAmount > 0) {
        return formatBubbleAmount(numericAmount);
      }

      return "--";
    }

    if (role === "to" && quote) {
      return formatBubbleAmount(quote.estimatedAmountOut);
    }

    return "--";
  }, [inputAmount, quote, role]);

  useEffect(() => {
    phaseStartedAt.current = performance.now();
  }, [phase, sequenceId]);

  useFrame((state, delta) => {
    if (!groupRef.current || !carryRef.current || !ownCarryRef.current) {
      return;
    }

    const exchangeTarget = getExchangeTarget(role);
    const roamRadiusX = 1.15 + (seed % 4) * 0.18;
    const roamRadiusZ = 0.95 + (seed % 5) * 0.14;
    const roamSpeed = 0.42 + (seed % 5) * 0.035;
    const headingSpeed = roamSpeed * 0.82;
    const idleX =
      homePosition[0] +
      Math.sin(state.clock.elapsedTime * roamSpeed + seed * 0.7) * roamRadiusX;
    const idleZ =
      homePosition[2] +
      Math.cos(state.clock.elapsedTime * headingSpeed + seed * 0.55) * roamRadiusZ;
    const idleY = Math.sin(state.clock.elapsedTime * 2.2 + seed * 0.4) * 0.1;
    const elapsed = Math.max(0, performance.now() - phaseStartedAt.current);
    const approachProgress = Math.min(1, elapsed / APPROACH_TABLE_DURATION);
    const settledProgress = Math.min(1, elapsed / LIVE_SWAP_SCENE_DURATIONS.settledHold);
    const recoveringProgress = Math.min(1, elapsed / LIVE_SWAP_SCENE_DURATIONS.recovering);
    const recoveringAtTable = phase === "recovering" && recoveringProgress < 0.45;

    const shouldMeet =
      role &&
      (phase === "approaching" ||
        phase === "ready" ||
        phase === "signing" ||
        phase === "confirming" ||
        phase === "settled" ||
        recoveringAtTable);

    const target = shouldMeet
      ? new THREE.Vector3(exchangeTarget[0], exchangeTarget[1], exchangeTarget[2])
      : new THREE.Vector3(idleX, idleY, idleZ);

    groupRef.current.position.lerp(target, 1 - Math.exp(-delta * (shouldMeet ? 3.8 : 2.4)));

    const nextIdleX =
      homePosition[0] +
      Math.sin((state.clock.elapsedTime + 0.18) * roamSpeed + seed * 0.7) * roamRadiusX;
    const nextIdleZ =
      homePosition[2] +
      Math.cos((state.clock.elapsedTime + 0.18) * headingSpeed + seed * 0.55) * roamRadiusZ;
    const lookTarget = shouldMeet
      ? role === "from"
        ? -0.2
        : 0.2
      : Math.atan2(nextIdleX - groupRef.current.position.x, nextIdleZ - groupRef.current.position.z);

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      shouldMeet ? (role === "from" ? 0.2 : Math.PI - 0.2) : lookTarget,
      1 - Math.exp(-delta * 4),
    );

    if (haloRef.current) {
      haloRef.current.scale.setScalar(
        THREE.MathUtils.lerp(
          haloRef.current.scale.x,
          selected ? 1.35 + Math.sin(state.clock.elapsedTime * 4) * 0.04 : 1,
          1 - Math.exp(-delta * 5),
        ),
      );
    }

    const defaultCarryPosition = new THREE.Vector3(0.42, 0.98, 0.16);
    const defaultCarryRotation = new THREE.Euler(0.08, -0.2, -0.18);
    const setdownCarryPosition = new THREE.Vector3(0.18, 0.76, 0.56);
    const setdownCarryRotation = new THREE.Euler(0.46, 0.02, -0.08);
    const pickupCarryPosition = new THREE.Vector3(0.16, 0.82, 0.54);
    const pickupCarryRotation = new THREE.Euler(0.34, -0.02, -0.12);
    const carryPosition = defaultCarryPosition.clone();
    const carryRotation = defaultCarryRotation.clone();
    let showOwnCarry = role === null;
    let showCounterpartyCarry = false;
    let carryGlowActive = selected && phase !== "idle" && phase !== "tokenSelection";

    if (role !== null) {
      if (phase === "ready" || phase === "signing" || phase === "confirming") {
        showOwnCarry = false;
        showCounterpartyCarry = false;
      } else if (phase === "approaching") {
        const setdownProgress = THREE.MathUtils.clamp((approachProgress - 0.55) / 0.35, 0, 1);
        carryPosition.lerpVectors(defaultCarryPosition, setdownCarryPosition, setdownProgress);
        carryRotation.set(
          THREE.MathUtils.lerp(defaultCarryRotation.x, setdownCarryRotation.x, setdownProgress),
          THREE.MathUtils.lerp(defaultCarryRotation.y, setdownCarryRotation.y, setdownProgress),
          THREE.MathUtils.lerp(defaultCarryRotation.z, setdownCarryRotation.z, setdownProgress),
        );
        showOwnCarry = approachProgress < 0.72;
        showCounterpartyCarry = false;
      } else if (phase === "settled") {
        if (settledProgress < 0.45) {
          showOwnCarry = false;
          showCounterpartyCarry = false;
        } else {
          const attachProgress = (settledProgress - 0.45) / 0.55;
          carryPosition.lerpVectors(pickupCarryPosition, defaultCarryPosition, attachProgress);
          carryRotation.set(
            THREE.MathUtils.lerp(pickupCarryRotation.x, defaultCarryRotation.x, attachProgress),
            THREE.MathUtils.lerp(pickupCarryRotation.y, defaultCarryRotation.y, attachProgress),
            THREE.MathUtils.lerp(pickupCarryRotation.z, defaultCarryRotation.z, attachProgress),
          );
          showOwnCarry = false;
          showCounterpartyCarry = true;
        }
      } else if (phase === "departing") {
        showOwnCarry = false;
        showCounterpartyCarry = true;
      } else if (phase === "recovering") {
        if (recoveringProgress < 0.45) {
          const attachProgress = recoveringProgress / 0.45;
          carryPosition.lerpVectors(pickupCarryPosition, defaultCarryPosition, attachProgress);
          carryRotation.set(
            THREE.MathUtils.lerp(pickupCarryRotation.x, defaultCarryRotation.x, attachProgress),
            THREE.MathUtils.lerp(pickupCarryRotation.y, defaultCarryRotation.y, attachProgress),
            THREE.MathUtils.lerp(pickupCarryRotation.z, defaultCarryRotation.z, attachProgress),
          );
        }
        showOwnCarry = true;
        showCounterpartyCarry = false;
      } else {
        showOwnCarry = true;
        showCounterpartyCarry = false;
      }
    }

    carryRef.current.visible = showOwnCarry || showCounterpartyCarry;
    carryRef.current.position.lerp(carryPosition, 1 - Math.exp(-delta * 8));
    carryRef.current.rotation.x = THREE.MathUtils.lerp(
      carryRef.current.rotation.x,
      carryRotation.x,
      1 - Math.exp(-delta * 8),
    );
    carryRef.current.rotation.y = THREE.MathUtils.lerp(
      carryRef.current.rotation.y,
      carryRotation.y,
      1 - Math.exp(-delta * 8),
    );
    carryRef.current.rotation.z = THREE.MathUtils.lerp(
      carryRef.current.rotation.z,
      carryRotation.z,
      1 - Math.exp(-delta * 8),
    );
    ownCarryRef.current.visible = showOwnCarry;

    if (counterpartyCarryRef.current) {
      counterpartyCarryRef.current.visible = showCounterpartyCarry;
    }

    ownCarryRef.current.scale.setScalar(carryGlowActive && showOwnCarry ? 1.05 : 1);

    if (counterpartyCarryRef.current) {
      counterpartyCarryRef.current.scale.setScalar(carryGlowActive && showCounterpartyCarry ? 1.05 : 1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 0.78, 0]}>
        <capsuleGeometry args={[0.3, 0.66, 8, 16]} />
        <meshStandardMaterial
          color={token.visual.primary}
          emissive={token.visual.emissive}
          emissiveIntensity={selected ? 0.28 : 0.08}
          metalness={0.62}
          roughness={0.26}
        />
      </mesh>

      <mesh castShadow position={[0, 1.42, 0.02]}>
        <sphereGeometry args={[0.22, 20, 20]} />
        <meshStandardMaterial
          color={token.visual.secondary}
          emissive={token.visual.glow}
          emissiveIntensity={selected ? 0.32 : 0.12}
          metalness={0.34}
          roughness={0.16}
        />
      </mesh>

      <mesh castShadow position={[-0.25, 0.62, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.56, 10]} />
        <meshStandardMaterial color={token.visual.secondary} metalness={0.5} roughness={0.36} />
      </mesh>
      <mesh castShadow position={[0.25, 0.62, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.56, 10]} />
        <meshStandardMaterial color={token.visual.secondary} metalness={0.5} roughness={0.36} />
      </mesh>

      <group ref={carryRef}>
        <group ref={ownCarryRef}>
          <TokenCase glowActive={selected} key={token.mint} token={token} />
        </group>
        {counterpartyToken ? (
          <group ref={counterpartyCarryRef}>
            <TokenCase glowActive={selected} key={counterpartyToken.mint} token={counterpartyToken} />
          </group>
        ) : null}
      </group>

      <mesh ref={haloRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.6, 48]} />
        <meshBasicMaterial
          color={selected ? token.visual.glow : theme.idleHalo}
          opacity={selected ? 0.9 : 0.35}
          transparent
        />
      </mesh>

      <Text
        anchorX="center"
        anchorY="middle"
        color={selected ? token.visual.glow : theme.idleLabel}
        fontSize={0.28}
        maxWidth={2.6}
        outlineColor={theme.outline}
        outlineWidth={0.02}
        position={[0, 2.05, 0]}
      >
        {token.symbol}
      </Text>

      {showBubble ? (
        <SpeechBubble
          darkMode={darkMode}
          logoUri={token.logoUri}
          mode={bubbleMode}
          symbol={token.symbol}
          valueLabel={bubbleValueLabel}
        />
      ) : null}
    </group>
  );
}
