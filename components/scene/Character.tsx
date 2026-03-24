"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type CharacterProps = {
  accent: string;
  isWalking: boolean;
  role: "player" | "agent";
};

export function Character({ accent, isWalking, role }: CharacterProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);

  const phaseOffset = role === "agent" ? Math.PI * 0.4 : 0;

  useFrame((state) => {
    const t = state.clock.elapsedTime * (isWalking ? 8.5 : 2.1) + phaseOffset;
    const swing = isWalking ? Math.sin(t) * 0.42 : Math.sin(t) * 0.07;
    const counterSwing = isWalking
      ? Math.sin(t + Math.PI) * 0.42
      : Math.sin(t + Math.PI) * 0.07;

    if (rootRef.current) {
      rootRef.current.position.y = isWalking
        ? Math.abs(Math.sin(t)) * 0.045
        : Math.sin(state.clock.elapsedTime * 1.3 + phaseOffset) * 0.02;
    }

    if (torsoRef.current) {
      torsoRef.current.rotation.z =
        role === "player" ? swing * 0.05 : counterSwing * 0.05;
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = counterSwing * 0.42 - 0.12;
    }

    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = swing * 0.42 + 0.12;
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.z = swing * 0.3;
    }

    if (rightLegRef.current) {
      rightLegRef.current.rotation.z = counterSwing * 0.3;
    }
  });

  const bodyColor = role === "player" ? "#0f1720" : "#171d25";
  const trimColor = role === "player" ? "#152b38" : "#1d2330";
  const headColor = role === "player" ? "#d5e2f3" : "#d9e4f5";

  return (
    <group ref={rootRef}>
      <group position={[0, 0.25, 0]}>
        <mesh ref={torsoRef} castShadow>
          <capsuleGeometry args={[0.42, 1.08, 8, 18]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={accent}
            emissiveIntensity={0.08}
            metalness={0.42}
            roughness={0.48}
          />
        </mesh>

        <mesh castShadow position={[0, 0.16, 0.35]}>
          <boxGeometry args={[0.42, 0.52, 0.08]} />
          <meshStandardMaterial
            color={trimColor}
            metalness={0.56}
            roughness={0.32}
          />
        </mesh>

        <mesh castShadow position={[0, 1.34, 0.03]}>
          <sphereGeometry args={[0.24, 28, 28]} />
          <meshStandardMaterial
            color={headColor}
            metalness={0.15}
            roughness={0.52}
          />
        </mesh>

        <mesh castShadow position={[0, 1.28, 0.22]}>
          <boxGeometry args={[0.33, 0.08, 0.12]} />
          <meshStandardMaterial
            color="#061019"
            emissive={accent}
            emissiveIntensity={0.18}
            metalness={0.68}
            roughness={0.2}
          />
        </mesh>

        <mesh
          castShadow
          position={[role === "player" ? -0.14 : 0.14, 1.56, -0.03]}
        >
          <boxGeometry args={[0.18, 0.08, 0.18]} />
          <meshStandardMaterial
            color={trimColor}
            metalness={0.42}
            roughness={0.34}
          />
        </mesh>

        <mesh ref={leftArmRef} castShadow position={[-0.6, 0.53, 0.02]}>
          <capsuleGeometry args={[0.1, 0.7, 6, 12]} />
          <meshStandardMaterial
            color={bodyColor}
            metalness={0.44}
            roughness={0.44}
          />
        </mesh>

        <mesh ref={rightArmRef} castShadow position={[0.6, 0.53, 0.02]}>
          <capsuleGeometry args={[0.1, 0.7, 6, 12]} />
          <meshStandardMaterial
            color={bodyColor}
            metalness={0.44}
            roughness={0.44}
          />
        </mesh>

        <mesh ref={leftLegRef} castShadow position={[-0.22, -0.86, 0]}>
          <capsuleGeometry args={[0.12, 0.86, 6, 12]} />
          <meshStandardMaterial
            color="#0f1318"
            metalness={0.32}
            roughness={0.5}
          />
        </mesh>

        <mesh ref={rightLegRef} castShadow position={[0.22, -0.86, 0]}>
          <capsuleGeometry args={[0.12, 0.86, 6, 12]} />
          <meshStandardMaterial
            color="#0f1318"
            metalness={0.32}
            roughness={0.5}
          />
        </mesh>

        <mesh receiveShadow position={[0, -1.43, 0]}>
          <cylinderGeometry args={[0.42, 0.48, 0.06, 24]} />
          <meshStandardMaterial color="#06090d" opacity={0.28} transparent />
        </mesh>
      </group>
    </group>
  );
}
