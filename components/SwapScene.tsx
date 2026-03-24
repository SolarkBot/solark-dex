"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { AssetBox } from "@/components/scene/AssetBox";
import { CenterPulse } from "@/components/scene/CenterPulse";
import { Character } from "@/components/scene/Character";
import { Ground } from "@/components/scene/Ground";
import { Suitcase } from "@/components/scene/Suitcase";
import {
  SWAP_PHASE_DURATIONS,
  type PreparedSwap,
  type SwapPhase,
  type SwapReceipt,
} from "@/lib/mockSwap";
import { getTokenDisplaySymbol, type TokenConfig } from "@/lib/tokens";

type SwapSceneProps = {
  activeSwap: PreparedSwap | null;
  currentFromToken: TokenConfig;
  currentToToken: TokenConfig;
  lastReceipt: SwapReceipt | null;
  phase: SwapPhase;
  runId: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

function vec(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [x, y, z];
}

function mixPoint(
  from: [number, number, number],
  to: [number, number, number],
  progress: number,
): [number, number, number] {
  return [
    lerp(from[0], to[0], progress),
    lerp(from[1], to[1], progress),
    lerp(from[2], to[2], progress),
  ];
}

function transferPoint(
  from: [number, number, number],
  center: [number, number, number],
  to: [number, number, number],
  progress: number,
) {
  if (progress < 0.42) {
    return mixPoint(from, center, ease(progress / 0.42));
  }

  if (progress < 0.58) {
    return center;
  }

  return mixPoint(center, to, ease((progress - 0.58) / 0.42));
}

function renderAsset(token: TokenConfig) {
  if (token.visual.kind === "suitcase") {
    return (
      <Suitcase
        accent={token.visual.accent}
        emissive={token.visual.emissive}
        label={getTokenDisplaySymbol(token)}
        logoUri={token.logoUri}
        position={[0, 0, 0]}
        primary={token.visual.primary}
        rotation={[0, 0, 0]}
      />
    );
  }

  return (
      <AssetBox
        accent={token.visual.accent}
        emissive={token.visual.emissive}
        label={getTokenDisplaySymbol(token)}
        logoUri={token.logoUri}
        position={[0, 0, 0]}
        primary={token.visual.primary}
        rotation={[0, 0, 0]}
      variant={token.visual.kind === "duffel" ? "duffel" : "crate"}
    />
  );
}

function SceneRig({
  activeSwap,
  currentFromToken,
  currentToToken,
  phase,
  runId,
}: SwapSceneProps) {
  const playerRef = useRef<THREE.Group>(null);
  const agentRef = useRef<THREE.Group>(null);
  const inputAssetRef = useRef<THREE.Group>(null);
  const outputAssetRef = useRef<THREE.Group>(null);
  const phaseStartedAt = useRef(performance.now());
  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const cameraLookAt = useMemo(() => new THREE.Vector3(0, 1.25, 0), []);
  const { camera, size } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    phaseStartedAt.current = performance.now();
  }, [phase, runId]);

  useFrame((state, delta) => {
    const isMobile = size.width < 640;
    const isTablet = size.width >= 640 && size.width < 1100;
    const elapsed = performance.now() - phaseStartedAt.current;
    const prepProgress =
      phase === "preparing"
        ? ease(clamp01(elapsed / SWAP_PHASE_DURATIONS.preparing))
        : phase === "approach" ||
            phase === "exchange" ||
            phase === "return" ||
            phase === "success"
          ? 1
          : 0;
    const approachProgress =
      phase === "approach"
        ? ease(clamp01(elapsed / SWAP_PHASE_DURATIONS.approach))
        : phase === "exchange" || phase === "return" || phase === "success"
          ? 1
          : 0;
    const returnProgress =
      phase === "return"
        ? ease(clamp01(elapsed / SWAP_PHASE_DURATIONS.return))
        : phase === "success"
          ? 1
          : 0;

    const playerIdle = vec(-3.28, -0.02, 0.26);
    const playerCenter = vec(-1.12, 0.0, 0.14);
    const agentIdle = vec(3.34, -0.02, -0.18);
    const agentCenter = vec(1.12, 0.0, -0.08);

    const playerTarget =
      returnProgress > 0
        ? mixPoint(playerCenter, playerIdle, returnProgress)
        : mixPoint(playerIdle, playerCenter, approachProgress * prepProgress);
    const agentTarget =
      returnProgress > 0
        ? mixPoint(agentCenter, agentIdle, returnProgress)
        : mixPoint(agentIdle, agentCenter, approachProgress * prepProgress);

    const walking = phase === "approach" || phase === "return";
    const lift = walking
      ? Math.abs(Math.sin(state.clock.elapsedTime * 7.8)) * 0.042
      : Math.sin(state.clock.elapsedTime * 1.7) * 0.014;

    if (playerRef.current) {
      tempVector.set(playerTarget[0], playerTarget[1] + lift, playerTarget[2]);
      playerRef.current.position.lerp(tempVector, 1 - Math.exp(-delta * 7));
      playerRef.current.rotation.y = THREE.MathUtils.lerp(
        playerRef.current.rotation.y,
        phase === "exchange"
          ? 0.02
          : phase === "return" || phase === "success"
            ? 0.16
            : 0.1,
        1 - Math.exp(-delta * 6),
      );
    }

    if (agentRef.current) {
      tempVector.set(agentTarget[0], agentTarget[1] + lift * 0.8, agentTarget[2]);
      agentRef.current.position.lerp(tempVector, 1 - Math.exp(-delta * 7));
      agentRef.current.rotation.y = THREE.MathUtils.lerp(
        agentRef.current.rotation.y,
        phase === "exchange"
          ? -0.04
          : phase === "return" || phase === "success"
            ? -0.18
            : -0.12,
        1 - Math.exp(-delta * 6),
      );
    }

    const playerPos =
      playerRef.current?.position ?? new THREE.Vector3(-3.28, 0, 0.26);
    const agentPos =
      agentRef.current?.position ?? new THREE.Vector3(3.34, 0, -0.18);
    const playerHand = vec(playerPos.x + 0.88, 1.03 + playerPos.y, 0.38);
    const agentHand = vec(agentPos.x - 0.92, 1.02 + agentPos.y, 0.06);
    const exchangeMidA = vec(-0.24, 1.24, 0.22);
    const exchangeMidB = vec(0.24, 1.2, -0.02);
    const exchangeProgress =
      phase === "exchange"
        ? ease(clamp01(elapsed / SWAP_PHASE_DURATIONS.exchange))
        : phase === "return" || phase === "success"
          ? 1
          : 0;

    const inputCarrier =
      phase === "return" || phase === "success" ? "agent" : "player";
    const outputCarrier =
      phase === "return" || phase === "success" ? "player" : "agent";

    const inputPosition =
      phase === "exchange"
        ? transferPoint(playerHand, exchangeMidA, agentHand, exchangeProgress)
        : inputCarrier === "player"
          ? playerHand
          : agentHand;

    const outputPosition =
      phase === "exchange"
        ? transferPoint(agentHand, exchangeMidB, playerHand, exchangeProgress)
        : outputCarrier === "player"
          ? playerHand
          : agentHand;

    const inputRotation: [number, number, number] =
      phase === "exchange"
        ? [0.02, lerp(-0.12, 0.14, exchangeProgress), 0.03]
        : inputCarrier === "player"
          ? [0.03, -0.24, -0.04]
          : [0.02, 0.14, 0.04];

    const outputRotation: [number, number, number] =
      phase === "exchange"
        ? [0.02, lerp(0.16, -0.12, exchangeProgress), 0.02]
        : outputCarrier === "player"
          ? [0.04, -0.16, 0.02]
          : [0.02, 0.16, -0.02];

    if (inputAssetRef.current) {
      tempVector.set(inputPosition[0], inputPosition[1], inputPosition[2]);
      inputAssetRef.current.position.lerp(tempVector, 1 - Math.exp(-delta * 10));
      inputAssetRef.current.rotation.x = THREE.MathUtils.lerp(
        inputAssetRef.current.rotation.x,
        inputRotation[0],
        1 - Math.exp(-delta * 8),
      );
      inputAssetRef.current.rotation.y = THREE.MathUtils.lerp(
        inputAssetRef.current.rotation.y,
        inputRotation[1],
        1 - Math.exp(-delta * 8),
      );
      inputAssetRef.current.rotation.z = THREE.MathUtils.lerp(
        inputAssetRef.current.rotation.z,
        inputRotation[2],
        1 - Math.exp(-delta * 8),
      );
    }

    if (outputAssetRef.current) {
      tempVector.set(outputPosition[0], outputPosition[1], outputPosition[2]);
      outputAssetRef.current.position.lerp(
        tempVector,
        1 - Math.exp(-delta * 10),
      );
      outputAssetRef.current.rotation.x = THREE.MathUtils.lerp(
        outputAssetRef.current.rotation.x,
        outputRotation[0],
        1 - Math.exp(-delta * 8),
      );
      outputAssetRef.current.rotation.y = THREE.MathUtils.lerp(
        outputAssetRef.current.rotation.y,
        outputRotation[1],
        1 - Math.exp(-delta * 8),
      );
      outputAssetRef.current.rotation.z = THREE.MathUtils.lerp(
        outputAssetRef.current.rotation.z,
        outputRotation[2],
        1 - Math.exp(-delta * 8),
      );
    }

    const orbitAmplitude = isMobile ? 0.08 : isTablet ? 0.12 : 0.18;
    const orbit = Math.sin(state.clock.elapsedTime * 0.24) * orbitAmplitude;
    const cameraTargetX =
      phase === "exchange"
        ? isMobile
          ? 0.06
          : 0.12
        : phase === "success"
          ? isMobile
            ? -0.08
            : -0.12
          : orbit;
    const cameraTargetZ =
      phase === "exchange"
        ? isMobile
          ? 10.15
          : isTablet
            ? 9.1
            : 8.35
        : phase === "success"
          ? isMobile
            ? 10.45
            : isTablet
              ? 9.55
              : 8.95
          : isMobile
            ? 11.05
            : isTablet
              ? 10.05
              : 9.4;
    const cameraTargetY =
      phase === "exchange"
        ? isMobile
          ? 3.65
          : isTablet
            ? 3.4
            : 3.18
        : phase === "success"
          ? isMobile
            ? 3.72
            : isTablet
              ? 3.48
              : 3.28
          : isMobile
            ? 3.9
            : isTablet
              ? 3.62
              : 3.44;
    const targetFov = isMobile ? 41 : isTablet ? 37 : 34;

    tempVector.set(cameraTargetX, cameraTargetY, cameraTargetZ);
    perspectiveCamera.position.lerp(tempVector, 1 - Math.exp(-delta * 2.2));
    perspectiveCamera.fov = THREE.MathUtils.lerp(
      perspectiveCamera.fov,
      targetFov,
      1 - Math.exp(-delta * 3.2),
    );
    perspectiveCamera.updateProjectionMatrix();
    cameraLookAt.set(
      0,
      phase === "exchange"
        ? isMobile
          ? 1.28
          : 1.45
        : isMobile
          ? 1.12
          : 1.25,
      0,
    );
    perspectiveCamera.lookAt(cameraLookAt);
  });

  const inputToken = activeSwap?.fromToken ?? currentFromToken;
  const outputToken = activeSwap?.toToken ?? currentToToken;
  return (
    <>
      <fog attach="fog" args={["#04070b", 10, 20]} />
      <ambientLight intensity={0.58} />
      <directionalLight
        castShadow
        intensity={1.85}
        position={[4.8, 6.2, 3.2]}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <spotLight
        angle={0.28}
        color="#9bcce8"
        intensity={18}
        penumbra={0.95}
        position={[0.4, 6.1, 2.5]}
      />
      <pointLight color="#4879bf" intensity={5} position={[-3.4, 2.4, 2.2]} />
      <pointLight color="#7399b4" intensity={4} position={[3.8, 2.6, 1.2]} />

      <Environment preset="night" />
      <Ground active={phase === "exchange" || phase === "success"} />
      <CenterPulse active={phase === "exchange"} />

      <group ref={playerRef}>
        <Character
          accent="#2f85ff"
          isWalking={phase === "approach" || phase === "return"}
          role="player"
        />
      </group>

      <group ref={agentRef}>
        <Character
          accent="#7fd8ff"
          isWalking={phase === "approach" || phase === "return"}
          role="agent"
        />
      </group>

      {inputToken ? <group ref={inputAssetRef}>{renderAsset(inputToken)}</group> : null}
      {outputToken ? <group ref={outputAssetRef}>{renderAsset(outputToken)}</group> : null}
    </>
  );
}

export default function SwapScene(props: SwapSceneProps) {
  return (
    <Canvas
      className="h-full w-full"
      camera={{ fov: 34, position: [0, 3.48, 9.25] }}
      dpr={[1, 1.8]}
      gl={{ alpha: false, antialias: true }}
      shadows={{ type: THREE.PCFShadowMap }}
    >
      <color attach="background" args={["#04070b"]} />
      <SceneRig {...props} />
    </Canvas>
  );
}
