"use client";

import { SceneAssetBadge } from "@/components/scene/AssetBadge";
import { type CarrierKind, type TokenConfig } from "@/lib/tokens";

type TokenCaseProps = {
  glowActive: boolean;
  token: TokenConfig;
};

function getCaseBadgePlacement(carrier: CarrierKind) {
  if (carrier === "suitcase") {
    return { position: [0, 0.02, 0.1] as [number, number, number], size: 24 };
  }

  if (carrier === "duffel") {
    return { position: [0, 0.02, 0.14] as [number, number, number], size: 22 };
  }

  if (carrier === "bag" || carrier === "techCase") {
    return { position: [0, 0.02, 0.16] as [number, number, number], size: 22 };
  }

  return { position: [0, 0.02, 0.14] as [number, number, number], size: 23 };
}

function CaseBadge({ token }: { token: TokenConfig }) {
  const badge = getCaseBadgePlacement(token.visual.carrier);

  return (
    <SceneAssetBadge
      accent={token.visual.accent}
      key={`${token.mint}-${token.logoUri ?? "fallback"}`}
      label={token.symbol}
      logoUri={token.logoUri}
      position={badge.position}
      size={badge.size}
      textColor="#eefbff"
    />
  );
}

export function TokenCase({ glowActive, token }: TokenCaseProps) {
  const bodyColor = glowActive ? token.visual.secondary : token.visual.primary;
  const auraOpacity = glowActive ? 0.26 : 0;
  const emissiveStrength = glowActive ? 0.58 : 0.16;
  const carrier = token.visual.carrier;

  if (carrier === "suitcase") {
    return (
      <group>
        {glowActive ? (
          <mesh scale={[1.12, 1.14, 1.18]}>
            <boxGeometry args={[0.42, 0.28, 0.18]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.glow}
              emissiveIntensity={0.72}
              metalness={0.48}
              opacity={auraOpacity}
              roughness={0.08}
              transparent
            />
          </mesh>
        ) : null}
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.28, 0.18]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={token.visual.glow}
            emissiveIntensity={emissiveStrength}
            metalness={0.72}
            roughness={0.24}
          />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <torusGeometry args={[0.09, 0.018, 8, 24, Math.PI]} />
          <meshStandardMaterial color={token.visual.glow} emissive={token.visual.glow} emissiveIntensity={0.2} />
        </mesh>
        {glowActive ? (
          <mesh>
            <boxGeometry args={[0.44, 0.04, 0.2]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.accent}
              emissiveIntensity={0.65}
              metalness={0.78}
              roughness={0.18}
            />
          </mesh>
        ) : null}
        <CaseBadge token={token} />
      </group>
    );
  }

  if (carrier === "bag") {
    return (
      <group>
        {glowActive ? (
          <mesh scale={1.18}>
            <icosahedronGeometry args={[0.22, 0]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.glow}
              emissiveIntensity={0.68}
              metalness={0.32}
              opacity={auraOpacity}
              roughness={0.16}
              transparent
            />
          </mesh>
        ) : null}
        <mesh castShadow>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={token.visual.glow}
            emissiveIntensity={emissiveStrength}
            metalness={0.26}
            roughness={0.62}
          />
        </mesh>
        <CaseBadge token={token} />
      </group>
    );
  }

  if (carrier === "duffel") {
    return (
      <group>
        {glowActive ? (
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[1.16, 1.08, 1.08]}>
            <capsuleGeometry args={[0.11, 0.26, 8, 16]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.glow}
              emissiveIntensity={0.7}
              metalness={0.3}
              opacity={auraOpacity}
              roughness={0.14}
              transparent
            />
          </mesh>
        ) : null}
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.11, 0.26, 8, 16]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={token.visual.glow}
            emissiveIntensity={emissiveStrength}
            metalness={0.32}
            roughness={0.55}
          />
        </mesh>
        {glowActive ? (
          <mesh>
            <torusGeometry args={[0.16, 0.02, 8, 32]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.accent}
              emissiveIntensity={0.7}
              metalness={0.62}
              roughness={0.16}
            />
          </mesh>
        ) : null}
        <CaseBadge token={token} />
      </group>
    );
  }

  if (carrier === "techCase") {
    return (
      <group>
        {glowActive ? (
          <mesh scale={1.18}>
            <octahedronGeometry args={[0.25, 0]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.glow}
              emissiveIntensity={0.74}
              metalness={0.78}
              opacity={auraOpacity}
              roughness={0.08}
              transparent
            />
          </mesh>
        ) : null}
        <mesh castShadow>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={token.visual.glow}
            emissiveIntensity={emissiveStrength}
            metalness={0.72}
            roughness={0.18}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.38, 0.04, 0.08]} />
          <meshStandardMaterial color={token.visual.glow} emissive={token.visual.glow} emissiveIntensity={0.44} />
        </mesh>
        <CaseBadge token={token} />
      </group>
    );
  }

  return (
    <group>
      {glowActive ? (
        <mesh scale={[1.16, 1.14, 1.14]}>
          <boxGeometry args={[0.34, 0.26, 0.26]} />
          <meshStandardMaterial
            color={token.visual.accent}
            emissive={token.visual.glow}
            emissiveIntensity={0.72}
            metalness={0.58}
            opacity={auraOpacity}
            roughness={0.1}
            transparent
          />
        </mesh>
      ) : null}
      <mesh castShadow>
        <boxGeometry args={[0.34, 0.26, 0.26]} />
        <meshStandardMaterial
          color={bodyColor}
          emissive={token.visual.glow}
          emissiveIntensity={emissiveStrength}
          metalness={0.58}
          roughness={0.28}
        />
      </mesh>
      {glowActive ? (
        <>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.04, 0.04]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.accent}
              emissiveIntensity={0.72}
              metalness={0.82}
              roughness={0.14}
            />
          </mesh>
          <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.38, 0.04, 0.04]} />
            <meshStandardMaterial
              color={token.visual.accent}
              emissive={token.visual.accent}
              emissiveIntensity={0.72}
              metalness={0.82}
              roughness={0.14}
            />
          </mesh>
        </>
      ) : null}
      <CaseBadge token={token} />
    </group>
  );
}
