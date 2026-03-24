"use client";

import { RoundedBox } from "@react-three/drei";
import { SceneAssetBadge } from "@/components/scene/AssetBadge";

type SuitcaseProps = {
  accent: string;
  emissive: string;
  label: string;
  logoUri?: string | null;
  position: [number, number, number];
  primary: string;
  rotation?: [number, number, number];
};

export function Suitcase({
  accent,
  emissive,
  label,
  logoUri,
  position,
  primary,
  rotation = [0, 0, 0],
}: SuitcaseProps) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox
        args={[0.7, 0.5, 0.24]}
        castShadow
        radius={0.05}
        smoothness={5}
      >
        <meshStandardMaterial
          color={primary}
          emissive={emissive}
          emissiveIntensity={0.05}
          metalness={0.72}
          roughness={0.24}
        />
      </RoundedBox>

      <mesh castShadow position={[0, 0.34, 0]}>
        <torusGeometry args={[0.13, 0.025, 10, 28, Math.PI]} />
        <meshStandardMaterial
          color={accent}
          metalness={0.88}
          roughness={0.18}
        />
      </mesh>

      <SceneAssetBadge
        accent={accent}
        label={label}
        logoUri={logoUri}
        position={[0, 0.04, 0.145]}
        size={23}
      />
    </group>
  );
}
