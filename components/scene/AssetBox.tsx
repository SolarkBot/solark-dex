"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { SceneAssetBadge } from "@/components/scene/AssetBadge";

type AssetBoxProps = {
  accent: string;
  emissive: string;
  label: string;
  logoUri?: string | null;
  position: [number, number, number];
  primary: string;
  rotation?: [number, number, number];
  variant?: "crate" | "duffel";
};

export function AssetBox({
  accent,
  emissive,
  label,
  logoUri,
  position,
  primary,
  rotation = [0, 0, 0],
  variant = "crate",
}: AssetBoxProps) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!rootRef.current) {
      return;
    }

    const settle = Math.sin(state.clock.elapsedTime * 2.4) * 0.015;
    rootRef.current.rotation.x +=
      (rotation[0] + settle - rootRef.current.rotation.x) * 0.08;
    rootRef.current.rotation.y +=
      (rotation[1] - rootRef.current.rotation.y) * 0.08;
    rootRef.current.rotation.z +=
      (rotation[2] - rootRef.current.rotation.z) * 0.08;
  });

  return (
    <group position={position} ref={rootRef}>
      {variant === "duffel" ? (
        <group>
          <mesh castShadow position={[0, 0, 0]}>
            <capsuleGeometry args={[0.18, 0.68, 8, 18]} />
            <meshStandardMaterial
              color={primary}
              emissive={emissive}
              emissiveIntensity={0.04}
              metalness={0.2}
              roughness={0.68}
            />
          </mesh>
          <mesh castShadow position={[0, 0.18, 0]}>
            <torusGeometry args={[0.14, 0.025, 8, 24, Math.PI]} />
            <meshStandardMaterial
              color={accent}
              metalness={0.45}
              roughness={0.35}
            />
          </mesh>
        </group>
      ) : (
        <group>
          <RoundedBox
            args={[0.72, 0.48, 0.46]}
            castShadow
            radius={0.06}
            smoothness={5}
          >
            <meshStandardMaterial
              color={primary}
              emissive={emissive}
              emissiveIntensity={0.08}
              metalness={0.56}
              roughness={0.28}
            />
          </RoundedBox>

          {[
            [-0.31, 0, 0],
            [0.31, 0, 0],
            [0, 0, -0.2],
            [0, 0, 0.2],
          ].map((rail, index) => (
            <mesh
              castShadow
              key={`${label}-rail-${index}`}
              position={rail as [number, number, number]}
              rotation={index > 1 ? [0, Math.PI / 2, 0] : [0, 0, 0]}
            >
              <boxGeometry args={[0.05, 0.38, 0.42]} />
              <meshStandardMaterial
                color={accent}
                emissive={accent}
                emissiveIntensity={0.14}
                metalness={0.8}
                roughness={0.18}
              />
            </mesh>
          ))}
        </group>
      )}

      <SceneAssetBadge
        accent={accent}
        label={label}
        logoUri={logoUri}
        position={[0, 0.03, variant === "duffel" ? 0.21 : 0.255]}
        size={variant === "duffel" ? 21 : 23}
        textColor={variant === "duffel" ? "#210e04" : "#07131d"}
      />
    </group>
  );
}
