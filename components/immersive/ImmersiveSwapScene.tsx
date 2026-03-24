"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { AgentManager } from "@/components/immersive/AgentManager";
import {
  buildMarketAgents,
  getPrimaryHomePosition,
} from "@/components/immersive/marketAgents";
import { ExchangeSequence } from "@/components/immersive/ExchangeSequence";
import { useResolvedSceneTokens } from "@/hooks/useResolvedSceneTokens";
import {
  type MockSwapResult,
  type SwapFlowPhase,
  type SwapQuote,
} from "@/lib/mockSwap";
import { type TokenConfig } from "@/lib/tokens";

type ImmersiveSwapSceneProps = {
  amount: string;
  availableTokens: TokenConfig[];
  darkMode: boolean;
  fromToken: TokenConfig;
  phase: SwapFlowPhase;
  quote: SwapQuote | null;
  receipt: MockSwapResult | null;
  selectedMints: string[];
  sequenceId: number;
  toToken: TokenConfig;
};

type SceneTheme = {
  ambientIntensity: number;
  background: string;
  directionalIntensity: number;
  fog: string;
  hemisphereGround: string;
  hemisphereSky: string;
  pointA: string;
  pointB: string;
  pointC: string;
  wall: string;
};

type OrbitInteractionState = {
  dragPitch: number;
  dragYaw: number;
  hoverPitch: number;
  hoverYaw: number;
  pointerId: number | null;
  radiusOffset: number;
  startPointer: { x: number; y: number } | null;
  startRotation: { pitch: number; yaw: number } | null;
};

const MIN_ORBIT_PHI = 0.72;
const MAX_ORBIT_PHI = 1.46;
const MIN_RADIUS_OFFSET = -2.4;
const MAX_RADIUS_OFFSET = 2.8;

function getSceneTheme(darkMode: boolean): SceneTheme {
  if (darkMode) {
    return {
      ambientIntensity: 0.58,
      background: "#04070b",
      directionalIntensity: 1.8,
      fog: "#04070b",
      hemisphereGround: "#071019",
      hemisphereSky: "#a5d7ff",
      pointA: "#67a7ff",
      pointB: "#59e3ff",
      pointC: "#a26bff",
      wall: "#08111a",
    };
  }

  return {
    ambientIntensity: 0.88,
    background: "#eef5ff",
    directionalIntensity: 2.2,
    fog: "#dfeeff",
    hemisphereGround: "#d9e7f6",
    hemisphereSky: "#ffffff",
    pointA: "#6aa8ff",
    pointB: "#8fd6ff",
    pointC: "#91b8ff",
    wall: "#dce9f8",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function CameraRig({
  availableTokens,
  fromToken,
  interactionRef,
  phase,
  toToken,
}: Pick<ImmersiveSwapSceneProps, "availableTokens" | "fromToken" | "phase" | "toToken"> & {
  interactionRef: MutableRefObject<OrbitInteractionState>;
}) {
  const { camera } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const temp = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const orbitPosition = useMemo(() => new THREE.Vector3(), []);
  const spherical = useMemo(() => new THREE.Spherical(), []);
  const marketAgents = useMemo(
    () => buildMarketAgents(availableTokens),
    [availableTokens],
  );

  useFrame((state, delta) => {
    const driftX = Math.sin(state.clock.elapsedTime * 0.18) * 0.35;
    const driftZ = Math.cos(state.clock.elapsedTime * 0.12) * 0.28;
    const fromHome = getPrimaryHomePosition(marketAgents, fromToken.mint);
    const toHome = getPrimaryHomePosition(marketAgents, toToken.mint);
    const selectedMid = new THREE.Vector3(
      (fromHome[0] + toHome[0]) / 2,
      0.9,
      (fromHome[2] + toHome[2]) / 2,
    );

    const focus =
      phase === "idle" || phase === "tokenSelection"
        ? new THREE.Vector3(0, 0.9, 0.4)
        : phase === "locatingAgents"
          ? selectedMid
          : new THREE.Vector3(0, 1.05, 0);

    const cameraTarget =
      phase === "locatingAgents"
        ? new THREE.Vector3(selectedMid.x + driftX * 0.2, 4.8, selectedMid.z + 7.1)
        : phase === "approaching" ||
            phase === "ready" ||
            phase === "signing" ||
            phase === "confirming" ||
            phase === "settled" ||
            phase === "departing" ||
            phase === "recovering" ||
            phase === "success"
          ? new THREE.Vector3(driftX, 4.4, 7.4 + driftZ * 0.5)
          : new THREE.Vector3(driftX, 6.2, 10.8 + driftZ);

    const interaction = interactionRef.current;
    offset.copy(cameraTarget).sub(focus);
    spherical.setFromVector3(offset);
    spherical.theta += interaction.dragYaw + interaction.hoverYaw;
    spherical.phi = clamp(
      spherical.phi + interaction.dragPitch + interaction.hoverPitch,
      MIN_ORBIT_PHI,
      MAX_ORBIT_PHI,
    );
    spherical.radius = clamp(
      spherical.radius + interaction.radiusOffset,
      4.8,
      14,
    );
    orbitPosition.setFromSpherical(spherical).add(focus);

    temp.copy(orbitPosition);
    perspectiveCamera.position.lerp(temp, 1 - Math.exp(-delta * 2.4));
    lookAt.copy(focus);
    perspectiveCamera.lookAt(lookAt);
    perspectiveCamera.fov = THREE.MathUtils.lerp(
      perspectiveCamera.fov,
      phase === "locatingAgents" ? 36 : phase === "idle" ? 42 : 34,
      1 - Math.exp(-delta * 2.4),
    );
    perspectiveCamera.updateProjectionMatrix();
  });

  return null;
}

function SceneWorld(props: ImmersiveSwapSceneProps) {
  const theme = useMemo(() => getSceneTheme(props.darkMode), [props.darkMode]);
  const activeSceneTokens = useMemo(() => {
    const tokens = [props.fromToken, props.toToken];

    if (props.receipt) {
      tokens.push(props.receipt.fromToken, props.receipt.toToken);
    }

    return tokens.filter(
      (token, index, list) => list.findIndex((candidate) => candidate.mint === token.mint) === index,
    );
  }, [props.fromToken, props.receipt, props.toToken]);
  const resolvedTokens = useResolvedSceneTokens(activeSceneTokens);
  const resolvedTokenByMint = useMemo(
    () =>
      resolvedTokens.reduce(
        (accumulator, token) => {
          accumulator[token.mint] = token;
          return accumulator;
        },
        {} as Record<string, TokenConfig>,
      ),
    [resolvedTokens],
  );
  const mergedAvailableTokens = useMemo(
    () =>
      props.availableTokens.map((token) => resolvedTokenByMint[token.mint] ?? token),
    [props.availableTokens, resolvedTokenByMint],
  );
  const resolvedFromToken =
    resolvedTokenByMint[props.fromToken.mint] ?? props.fromToken;
  const resolvedToToken =
    resolvedTokenByMint[props.toToken.mint] ?? props.toToken;

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.fog, 12, 24]} />
      <ambientLight intensity={theme.ambientIntensity} />
      <hemisphereLight args={[theme.hemisphereSky, theme.hemisphereGround, 0.85]} />
      <directionalLight
        castShadow
        intensity={theme.directionalIntensity}
        position={[4.5, 8, 4]}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <pointLight color={theme.pointA} intensity={20} position={[-6, 3.5, -2]} />
      <pointLight color={theme.pointB} intensity={16} position={[6, 3.8, 3]} />
      <pointLight color={theme.pointC} intensity={10} position={[0, 5.5, 7]} />

      <AgentManager
        amount={props.amount}
        availableTokens={mergedAvailableTokens}
        darkMode={props.darkMode}
        fromToken={resolvedFromToken}
        phase={props.phase}
        quote={props.quote}
        selectedMints={props.selectedMints}
        sequenceId={props.sequenceId}
        toToken={resolvedToToken}
      />

      <ExchangeSequence
        fromToken={resolvedFromToken}
        phase={props.phase}
        receipt={props.receipt}
        sequenceId={props.sequenceId}
        toToken={resolvedToToken}
      />

      <mesh position={[0, 4.2, -8]}>
        <planeGeometry args={[28, 14]} />
        <meshBasicMaterial color={theme.wall} />
      </mesh>
    </>
  );
}

export function ImmersiveSwapScene(props: ImmersiveSwapSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<OrbitInteractionState>({
    dragPitch: 0,
    dragYaw: 0,
    hoverPitch: 0,
    hoverYaw: 0,
    pointerId: null,
    radiusOffset: 0,
    startPointer: null,
    startRotation: null,
  });
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }

    orbitRef.current.pointerId = event.pointerId;
    orbitRef.current.startPointer = { x: event.clientX, y: event.clientY };
    orbitRef.current.startRotation = {
      pitch: orbitRef.current.dragPitch,
      yaw: orbitRef.current.dragYaw,
    };
    setDragging(true);
    containerRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const normalizedX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normalizedY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    if (
      orbitRef.current.pointerId === event.pointerId &&
      orbitRef.current.startPointer &&
      orbitRef.current.startRotation
    ) {
      const deltaX = event.clientX - orbitRef.current.startPointer.x;
      const deltaY = event.clientY - orbitRef.current.startPointer.y;

      orbitRef.current.dragYaw = orbitRef.current.startRotation.yaw - deltaX * 0.008;
      orbitRef.current.dragPitch = clamp(
        orbitRef.current.startRotation.pitch - deltaY * 0.0045,
        -0.34,
        0.22,
      );
      orbitRef.current.hoverYaw = 0;
      orbitRef.current.hoverPitch = 0;
      return;
    }

    orbitRef.current.hoverYaw = normalizedX * 0.18;
    orbitRef.current.hoverPitch = normalizedY * 0.06;
  };

  const releasePointer = (pointerId: number | null) => {
    if (containerRef.current && pointerId !== null && containerRef.current.hasPointerCapture(pointerId)) {
      containerRef.current.releasePointerCapture(pointerId);
    }

    orbitRef.current.pointerId = null;
    orbitRef.current.startPointer = null;
    orbitRef.current.startRotation = null;
    setDragging(false);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (orbitRef.current.pointerId === event.pointerId) {
      releasePointer(event.pointerId);
    }
  };

  const handlePointerLeave = () => {
    if (!dragging) {
      orbitRef.current.hoverYaw = 0;
      orbitRef.current.hoverPitch = 0;
    }
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    orbitRef.current.radiusOffset = clamp(
      orbitRef.current.radiusOffset + event.deltaY * 0.0035,
      MIN_RADIUS_OFFSET,
      MAX_RADIUS_OFFSET,
    );
  };

  return (
    <div
      className={`h-full w-full touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => releasePointer(orbitRef.current.pointerId)}
      onWheel={handleWheel}
      ref={containerRef}
    >
      <Canvas
        camera={{ fov: 40, position: [0, 6.2, 10.8] }}
        dpr={[1, 1.7]}
        gl={{ antialias: true }}
        shadows
      >
        <SceneWorld {...props} />
        <CameraRig
          availableTokens={props.availableTokens}
          fromToken={props.fromToken}
          interactionRef={orbitRef}
          phase={props.phase}
          toToken={props.toToken}
        />
      </Canvas>
    </div>
  );
}
