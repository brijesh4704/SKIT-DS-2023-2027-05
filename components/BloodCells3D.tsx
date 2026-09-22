"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type CellProps = { position: [number, number, number]; scale: number; speed: number; rotation: [number, number, number] };

function BloodCell({ position, scale, speed, rotation }: CellProps) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const radius = 0.08 + t * 0.92;
      const z = 0.28 - 0.42 * Math.exp(-Math.pow((radius - 0.52) / 0.32, 2));
      points.push(new THREE.Vector2(radius, z));
    }
    return new THREE.LatheGeometry(points, 48);
  }, []);

  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime;
    group.current.rotation.x = rotation[0] + Math.sin(time * 0.25 * speed) * 0.16;
    group.current.rotation.y = rotation[1] + time * 0.12 * speed;
    group.current.rotation.z = rotation[2] + Math.cos(time * 0.22 * speed) * 0.1;
  });

  return (
    <Float speed={speed} rotationIntensity={0.35} floatIntensity={0.55}>
      <group ref={group} position={position} scale={scale}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial color="#e65b78" roughness={0.28} metalness={0} clearcoat={0.9} clearcoatRoughness={0.18} transmission={0.04} transparent opacity={0.68} />
        </mesh>
        <mesh position={[0, 0.02, 0]} scale={0.55}>
          <sphereGeometry args={[0.62, 24, 24]} />
          <meshBasicMaterial color="#ffb5c3" transparent opacity={0.08} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[4, 5, 5]} intensity={2} />
      <pointLight position={[-4, 2, 3]} intensity={4} distance={9} color="#ff8098" />
      <pointLight position={[4, -2, 2]} intensity={3} distance={8} color="#ffc1cc" />
      <BloodCell position={[-4.7, 2.5, -2]} scale={0.75} speed={0.55} rotation={[0.4, 0.2, 0]} />
      <BloodCell position={[4.5, 2.3, -2.5]} scale={0.55} speed={0.7} rotation={[0.2, 0.4, 0]} />
      <BloodCell position={[-4.8, -2.4, -1]} scale={0.52} speed={0.65} rotation={[0.5, 0.1, 0.2]} />
      <BloodCell position={[4.6, -2.2, -2]} scale={0.7} speed={0.5} rotation={[0.2, 0.5, 0]} />
      <BloodCell position={[-2.9, 1.1, -0.5]} scale={0.3} speed={1} rotation={[0.2, 0.3, 0]} />
      <BloodCell position={[3, 0.7, -0.8]} scale={0.27} speed={1.1} rotation={[0.4, 0.2, 0]} />
      <BloodCell position={[-2.8, -1.5, 0]} scale={0.24} speed={1.2} rotation={[0.1, 0.5, 0]} />
      <BloodCell position={[2.8, -1.4, -0.2]} scale={0.34} speed={0.9} rotation={[0.3, 0.2, 0]} />
      <BloodCell position={[-1.5, 2.7, -2.5]} scale={0.14} speed={1.4} rotation={[0.2, 0.3, 0]} />
      <BloodCell position={[1.4, 2.5, -2.5]} scale={0.12} speed={1.5} rotation={[0.3, 0.1, 0]} />
      <BloodCell position={[-1.3, -2.5, -2]} scale={0.15} speed={1.3} rotation={[0.1, 0.4, 0]} />
      <BloodCell position={[1.5, -2.6, -2]} scale={0.13} speed={1.4} rotation={[0.2, 0.2, 0]} />
    </>
  );
}

export default function BloodCells3D() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(244,63,94,0.10),transparent_42%)]" />
      <div className="absolute inset-0 opacity-[0.62]">
        <Canvas dpr={[1, 1.35]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
          <Scene />
        </Canvas>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,247,248,0.88)_0%,rgba(255,247,248,0.42)_35%,rgba(255,247,248,0.05)_70%,rgba(255,247,248,0.72)_100%)]" />
    </div>
  );
}
