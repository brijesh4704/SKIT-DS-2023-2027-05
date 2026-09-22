"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  PerspectiveCamera,
  Sparkles,
} from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function BloodCore() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    meshRef.current.rotation.x =
      state.clock.elapsedTime * 0.12;

    meshRef.current.rotation.y =
      state.clock.elapsedTime * 0.18;
  });

  return (
    <Float
      speed={1.2}
      rotationIntensity={0.25}
      floatIntensity={0.6}
    >
      <mesh ref={meshRef} scale={2.2}>
        <icosahedronGeometry args={[1, 5]} />

        <MeshDistortMaterial
          color="#ed172b"
          emissive="#780713"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.15}
          distort={0.3}
          speed={1.7}
        />
      </mesh>
    </Float>
  );
}

function OrbitRing({
  radius,
  rotation,
  speed,
}: {
  radius: number;
  rotation: [number, number, number];
  speed: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ringRef.current) return;

    ringRef.current.rotation.z += speed;
    ringRef.current.rotation.y += speed * 0.4;
  });

  return (
    <mesh
      ref={ringRef}
      rotation={rotation}
    >
      <torusGeometry
        args={[radius, 0.012, 16, 160]}
      />

      <meshBasicMaterial
        color="#ff5362"
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

function FloatingCells() {
  const cells = Array.from({ length: 20 });

  return (
    <>
      {cells.map((_, index) => {
        const angle =
          (index / cells.length) * Math.PI * 2;

        const radius =
          3.4 + (index % 3) * 0.45;

        const x =
          Math.cos(angle) * radius;

        const y =
          Math.sin(angle * 1.8) * 2.2;

        const z =
          Math.sin(angle) * radius * 0.5;

        return (
          <Float
            key={index}
            speed={0.7 + (index % 4) * 0.15}
            floatIntensity={0.7}
            rotationIntensity={1}
          >
            <mesh
              position={[x, y, z]}
              scale={
                0.035 + (index % 4) * 0.012
              }
            >
              <sphereGeometry
                args={[1, 16, 16]}
              />

              <meshStandardMaterial
                color="#f52b40"
                emissive="#7d0715"
                emissiveIntensity={1}
              />
            </mesh>
          </Float>
        );
      })}
    </>
  );
}

export default function BloodHero3D() {
  return (
    <div className="blood-3d">
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 9]}
          fov={45}
        />

        <ambientLight intensity={1.4} />

        <pointLight
          position={[4, 4, 6]}
          intensity={12}
          distance={15}
          color="#ff3046"
        />

        <pointLight
          position={[-5, -3, 4]}
          intensity={7}
          distance={12}
          color="#ff9aa5"
        />

        <BloodCore />

        <OrbitRing
          radius={2.9}
          rotation={[Math.PI / 2.3, 0, 0]}
          speed={0.004}
        />

        <OrbitRing
          radius={3.3}
          rotation={[Math.PI / 3, 0.4, 0]}
          speed={-0.002}
        />

        <FloatingCells />

        <Sparkles
          count={80}
          scale={9}
          size={1.2}
          speed={0.25}
          color="#ff7180"
        />
      </Canvas>
    </div>
  );
}