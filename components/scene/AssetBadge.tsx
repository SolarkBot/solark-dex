"use client";

import { Billboard, Html, Text } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

type SharedAssetBadgeProps = {
  accent: string;
  label: string;
  logoUri?: string | null;
  position: [number, number, number];
  size?: number;
  textColor?: string;
};

function getInitials(label: string) {
  const normalized = label.trim().toUpperCase();

  if (!normalized) {
    return "?";
  }

  return normalized.length <= 4 ? normalized : normalized.slice(0, 3);
}

function buildSceneLogoUri(logoUri?: string | null) {
  if (!logoUri) {
    return null;
  }

  if (logoUri.startsWith("/") || logoUri.startsWith("data:") || logoUri.startsWith("blob:")) {
    return logoUri;
  }

  return `/api/assets/logo?src=${encodeURIComponent(logoUri)}`;
}

function useBadgeTexture(logoUri?: string | null) {
  const [imageFailed, setImageFailed] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureUri = useMemo(() => buildSceneLogoUri(logoUri), [logoUri]);

  useEffect(() => {
    let active = true;
    let loadedTexture: THREE.Texture | null = null;

    setImageFailed(false);
    setTexture(null);

    if (!textureUri) {
      return () => undefined;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      textureUri,
      (nextTexture) => {
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.needsUpdate = true;
        loadedTexture = nextTexture;

        if (!active) {
          nextTexture.dispose();
          return;
        }

        setTexture(nextTexture);
      },
      undefined,
      () => {
        if (active) {
          setImageFailed(true);
        }
      },
    );

    return () => {
      active = false;

      if (loadedTexture) {
        loadedTexture.dispose();
      }
    };
  }, [textureUri]);

  return { imageFailed, texture };
}

export function OverlayAssetBadge({
  accent,
  label,
  logoUri,
  position,
  size = 26,
  textColor = "#07131d",
}: SharedAssetBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [label, logoUri]);

  return (
    <Html center distanceFactor={9} position={position} transform>
      <div
        className="flex items-center justify-center overflow-hidden rounded-full border"
        style={{
          backdropFilter: "blur(6px)",
          backgroundColor: "var(--badge-bg)",
          borderColor: "var(--badge-border)",
          boxShadow: `0 8px 18px var(--badge-shadow), 0 0 0 1px rgba(255,255,255,0.04), 0 0 10px ${accent}14`,
          height: size,
          width: size,
        }}
      >
        {logoUri && !imageFailed ? (
          <div
            className="h-[78%] w-[78%] overflow-hidden rounded-full border"
            style={{
              backgroundColor: "var(--badge-inner-bg)",
              borderColor: "var(--badge-border)",
            }}
          >
            <img
              alt={label}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
              src={logoUri}
            />
          </div>
        ) : (
          <span
            className="font-display text-center text-[8px] font-bold tracking-[0.08em]"
            style={{ color: textColor }}
          >
            {label}
          </span>
        )}
      </div>
    </Html>
  );
}

export function SceneAssetBadge({
  accent,
  label,
  logoUri,
  position,
  size = 26,
  textColor = "#eefbff",
}: SharedAssetBadgeProps) {
  const { imageFailed, texture } = useBadgeTexture(logoUri);
  const initials = useMemo(() => getInitials(label), [label]);
  const radius = size / 145;
  const ringInnerRadius = radius * 0.84;
  const faceRadius = radius * 0.72;
  const insetRadius = radius * 0.77;

  return (
    <Billboard follow position={position}>
      <group>
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[radius, 32]} />
          <meshBasicMaterial
            color="#f8fbff"
            depthTest
            depthWrite
            opacity={0.96}
            toneMapped={false}
            transparent
          />
        </mesh>
        <mesh position={[0, 0, -0.006]}>
          <ringGeometry args={[ringInnerRadius, radius, 32]} />
          <meshBasicMaterial color={accent} depthTest depthWrite toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.002]}>
          <circleGeometry args={[insetRadius, 32]} />
          <meshBasicMaterial
            color="#eaf5ff"
            depthTest
            depthWrite
            opacity={0.98}
            toneMapped={false}
            transparent
          />
        </mesh>
        {texture && !imageFailed ? (
          <mesh position={[0, 0, 0.006]}>
            <circleGeometry args={[faceRadius, 32]} />
            <meshBasicMaterial
              alphaTest={0.08}
              depthTest
              depthWrite
              map={texture}
              toneMapped={false}
              transparent
            />
          </mesh>
        ) : (
          <>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[faceRadius, 32]} />
              <meshBasicMaterial color="#13202e" depthTest depthWrite toneMapped={false} />
            </mesh>
            <Text
              anchorX="center"
              anchorY="middle"
              color={textColor}
              fontSize={radius * 0.56}
              maxWidth={radius * 1.25}
              outlineColor="#061018"
              outlineWidth={radius * 0.06}
              position={[0, 0, 0.014]}
            >
              {initials}
            </Text>
          </>
        )}
      </group>
    </Billboard>
  );
}

export const AssetBadge = OverlayAssetBadge;
