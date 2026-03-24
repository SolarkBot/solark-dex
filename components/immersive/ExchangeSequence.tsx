"use client";

import { Float, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TokenCase } from "@/components/immersive/TokenCase";
import {
  LIVE_SWAP_SCENE_DURATIONS,
  type MockSwapResult,
  type SwapFlowPhase,
} from "@/lib/mockSwap";
import { type TokenConfig } from "@/lib/tokens";

type ExchangeSequenceProps = {
  fromToken: TokenConfig;
  phase: SwapFlowPhase;
  receipt: MockSwapResult | null;
  sequenceId: number;
  toToken: TokenConfig;
};

const LEFT_TABLE_SLOT: [number, number, number] = [-0.28, 1.03, 0.14];
const RIGHT_TABLE_SLOT: [number, number, number] = [0.28, 1.03, -0.14];
const LEFT_HANDOFF_ANCHOR: [number, number, number] = [-1.1, 1.02, 0.52];
const RIGHT_HANDOFF_ANCHOR: [number, number, number] = [1.1, 1.02, -0.52];
const APPROACH_TABLE_DURATION = 860;

function arcPoint(
  start: [number, number, number],
  end: [number, number, number],
  progress: number,
  lift: number,
): [number, number, number] {
  const arc = Math.sin(progress * Math.PI) * lift;

  return [
    THREE.MathUtils.lerp(start[0], end[0], progress),
    THREE.MathUtils.lerp(start[1], end[1], progress) + arc,
    THREE.MathUtils.lerp(start[2], end[2], progress),
  ];
}

function recoveryPoint(
  tableSlot: [number, number, number],
  handoffAnchor: [number, number, number],
  progress: number,
): [number, number, number] {
  return arcPoint(tableSlot, handoffAnchor, progress / 0.45, 0.2);
}

export function ExchangeSequence({
  fromToken,
  phase,
  receipt,
  sequenceId,
  toToken,
}: ExchangeSequenceProps) {
  const fromCargoRef = useRef<THREE.Group>(null);
  const toCargoRef = useRef<THREE.Group>(null);
  const phaseStartedAt = useRef(0);
  const cargoActive =
    phase === "approaching" ||
    phase === "ready" ||
    phase === "signing" ||
    phase === "confirming" ||
    phase === "settled" ||
    phase === "recovering";
  const tableActive = cargoActive;

  useEffect(() => {
    phaseStartedAt.current = performance.now();
  }, [phase, sequenceId]);

  useFrame((state) => {
    const elapsed = Math.max(0, performance.now() - phaseStartedAt.current);
    const approachProgress = Math.min(1, elapsed / APPROACH_TABLE_DURATION);
    const settledProgress = Math.min(
      1,
      elapsed / LIVE_SWAP_SCENE_DURATIONS.settledHold,
    );
    const departingProgress = Math.min(
      1,
      elapsed / LIVE_SWAP_SCENE_DURATIONS.departing,
    );
    const recoveringProgress = Math.min(
      1,
      elapsed / LIVE_SWAP_SCENE_DURATIONS.recovering,
    );
    let fromPosition: [number, number, number] = LEFT_TABLE_SLOT;
    let toPosition: [number, number, number] = RIGHT_TABLE_SLOT;
    let fromRotation = 0;
    let toRotation = 0;

    if (phase === "approaching") {
      const setdownProgress = THREE.MathUtils.clamp((approachProgress - 0.7) / 0.3, 0, 1);
      fromPosition = arcPoint(
        LEFT_HANDOFF_ANCHOR,
        LEFT_TABLE_SLOT,
        setdownProgress,
        0.12,
      );
      toPosition = arcPoint(
        RIGHT_HANDOFF_ANCHOR,
        RIGHT_TABLE_SLOT,
        setdownProgress,
        0.12,
      );
      fromRotation = THREE.MathUtils.lerp(0.38, 0, setdownProgress);
      toRotation = THREE.MathUtils.lerp(-0.38, 0, setdownProgress);
    } else if (
      phase === "ready" ||
      phase === "signing" ||
      phase === "confirming"
    ) {
      fromPosition = [
        LEFT_TABLE_SLOT[0],
        LEFT_TABLE_SLOT[1],
        LEFT_TABLE_SLOT[2],
      ];
      toPosition = [
        RIGHT_TABLE_SLOT[0],
        RIGHT_TABLE_SLOT[1],
        RIGHT_TABLE_SLOT[2],
      ];
      fromRotation = 0;
      toRotation = 0;
    } else if (phase === "settled") {
      fromPosition = recoveryPoint(
        RIGHT_TABLE_SLOT,
        LEFT_HANDOFF_ANCHOR,
        settledProgress,
      );
      toPosition = recoveryPoint(
        LEFT_TABLE_SLOT,
        RIGHT_HANDOFF_ANCHOR,
        settledProgress,
      );
      fromRotation = THREE.MathUtils.lerp(0, 0.38, settledProgress / 0.45);
      toRotation = THREE.MathUtils.lerp(0, -0.38, settledProgress / 0.45);
    } else if (phase === "recovering") {
      fromPosition = recoveryPoint(
        LEFT_TABLE_SLOT,
        LEFT_HANDOFF_ANCHOR,
        recoveringProgress,
      );
      toPosition = recoveryPoint(
        RIGHT_TABLE_SLOT,
        RIGHT_HANDOFF_ANCHOR,
        recoveringProgress,
      );
      fromRotation = THREE.MathUtils.lerp(0, 0.38, recoveringProgress / 0.45);
      toRotation = THREE.MathUtils.lerp(0, -0.38, recoveringProgress / 0.45);
    }

    if (fromCargoRef.current) {
      fromCargoRef.current.visible =
        (phase === "approaching" && approachProgress >= 0.72) ||
        phase === "ready" ||
        phase === "signing" ||
        phase === "confirming" ||
        (phase === "settled" && settledProgress < 0.45) ||
        (phase === "recovering" && recoveringProgress < 0.45);
      fromCargoRef.current.position.set(...fromPosition);
      fromCargoRef.current.rotation.y = fromRotation;
    }

    if (toCargoRef.current) {
      toCargoRef.current.visible =
        (phase === "approaching" && approachProgress >= 0.72) ||
        phase === "ready" ||
        phase === "signing" ||
        phase === "confirming" ||
        (phase === "settled" && settledProgress < 0.45) ||
        (phase === "recovering" && recoveringProgress < 0.45);
      toCargoRef.current.position.set(...toPosition);
      toCargoRef.current.rotation.y = toRotation;
    }
  });

  const showLane =
    phase === "locatingAgents" ||
    phase === "approaching" ||
    phase === "ready" ||
    phase === "signing" ||
    phase === "confirming" ||
    phase === "settled" ||
    phase === "departing" ||
    phase === "recovering";
  const showCargo =
    phase === "approaching" ||
    phase === "ready" ||
    phase === "signing" ||
    phase === "confirming" ||
    phase === "settled" ||
    phase === "recovering";
  const laneOpacity =
    phase === "confirming"
      ? 0.2
      : phase === "signing" ||
          phase === "settled" ||
          phase === "recovering"
        ? 0.14
        : 0.08;

  return (
    <>
      <group position={[0, 0, 0]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.2, 0.28, 0.9, 18]} />
          <meshStandardMaterial color="#e7edf6" metalness={0.38} roughness={0.52} />
        </mesh>
        <mesh castShadow position={[0, 0.96, 0]}>
          <cylinderGeometry args={[0.86, 0.78, 0.12, 28]} />
          <meshStandardMaterial color="#f4f8ff" metalness={0.34} roughness={0.26} />
        </mesh>
        <mesh position={[0, 1.03, 0]}>
          <cylinderGeometry args={[0.9, 0.84, 0.02, 28]} />
          <meshBasicMaterial color="#b7e7ff" opacity={tableActive ? 0.16 : 0.06} transparent />
        </mesh>
      </group>

      {showLane ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <planeGeometry args={[3.8, 1.3]} />
          <meshBasicMaterial color="#89daff" opacity={laneOpacity} transparent />
        </mesh>
      ) : null}

      {tableActive ? (
        <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.04, 12, 42]} />
          <meshBasicMaterial color="#8fe1ff" opacity={0.16} transparent />
        </mesh>
      ) : null}

      {showCargo ? (
        <group ref={fromCargoRef}>
          <TokenCase
            glowActive
            key={(phase === "settled" ? toToken : fromToken).mint}
            token={phase === "settled" ? toToken : fromToken}
          />
        </group>
      ) : null}

      {showCargo ? (
        <group ref={toCargoRef}>
          <TokenCase
            glowActive
            key={(phase === "settled" ? fromToken : toToken).mint}
            token={phase === "settled" ? fromToken : toToken}
          />
        </group>
      ) : null}

      {phase === "success" && receipt ? (
        <Float floatIntensity={0.9} speed={1.1}>
          <group position={[0, 3.1, 0]}>
            <Text
              anchorX="center"
              anchorY="middle"
              color="#b6ffe0"
              fontSize={0.34}
              maxWidth={6}
              outlineColor="#041118"
              outlineWidth={0.03}
            >
              SWAP CONFIRMED
            </Text>
            <Text
              anchorX="center"
              anchorY="middle"
              color="#d8e8f7"
              fontSize={0.18}
              maxWidth={7}
              outlineColor="#041118"
              outlineWidth={0.02}
              position={[0, -0.42, 0]}
            >
              BOUGHT {receipt.receivedLabel} WITH {receipt.originalAmountLabel}
            </Text>
          </group>
        </Float>
      ) : null}
    </>
  );
}
