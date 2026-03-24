"use client";

import { ContactShadows } from "@react-three/drei";

export function Ground({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, -0.28, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#04070a" metalness={0.3} roughness={0.18} />
      </mesh>

      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[3.6, 3.82, 0.38, 72]} />
        <meshStandardMaterial color="#10161e" metalness={0.56} roughness={0.36} />
      </mesh>

      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.12, 72]} />
        <meshStandardMaterial color="#0c1218" metalness={0.42} roughness={0.14} />
      </mesh>

      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.12, 2.22, 96]} />
        <meshBasicMaterial
          color="#78d9ff"
          opacity={active ? 0.18 : 0.08}
          transparent
        />
      </mesh>

      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.56, 0.03, 18, 96]} />
        <meshStandardMaterial
          color="#82d7ff"
          emissive="#82d7ff"
          emissiveIntensity={active ? 0.22 : 0.05}
          metalness={0.72}
          roughness={0.22}
        />
      </mesh>

      <ContactShadows
        blur={1.8}
        far={8}
        opacity={0.42}
        position={[0, -0.22, 0]}
        resolution={1024}
        scale={10}
      />
    </group>
  );
}
