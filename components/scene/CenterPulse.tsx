"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function CenterPulse({ active }: { active: boolean }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const pulse = active ? 1 + Math.sin(state.clock.elapsedTime * 7.5) * 0.07 : 1;

    if (outerRef.current) {
      outerRef.current.scale.setScalar(pulse);
      const material = outerRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = active
        ? 0.12 + Math.sin(state.clock.elapsedTime * 7.5) * 0.04
        : 0.03;
    }

    if (innerRef.current) {
      innerRef.current.scale.setScalar(
        active ? 1 + Math.sin(state.clock.elapsedTime * 6.1) * 0.04 : 1,
      );
    }
  });

  return (
    <group>
      <mesh
        position={[0, 0.225, 0]}
        ref={outerRef}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.42, 0.82, 64]} />
        <meshBasicMaterial color="#8fdfff" opacity={0.05} transparent />
      </mesh>

      <mesh
        position={[0, 0.23, 0]}
        ref={innerRef}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.24, 48]} />
        <meshBasicMaterial
          color="#2f85ff"
          opacity={active ? 0.11 : 0.04}
          transparent
        />
      </mesh>
    </group>
  );
}
