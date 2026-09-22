"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function BloodCell({ scale = 1, position = [0, 0, 0] }: { scale?: number; position?: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.08;
    ref.current.rotation.y = state.clock.elapsedTime * 0.12;
  });
  return (
    <Float speed={1} rotationIntensity={0.15} floatIntensity={0.35}>
      <mesh ref={ref} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial color="#e91b32" emissive="#720815" emissiveIntensity={0.28} roughness={0.22} metalness={0.05} distort={0.28} speed={1.15} />
      </mesh>
    </Float>
  );
}
function Orbit({ radius, rotation, speed, opacity }: { radius: number; rotation: [number, number, number]; speed: number; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * speed;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.12;
  });
  return (
    <mesh ref={ref} rotation={rotation}>
      <torusGeometry args={[radius, 0.009, 12, 160]} />
      <meshBasicMaterial color="#ef5364" transparent opacity={opacity} />
    </mesh>
  );
}
function FloatingCell({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.15;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#dc1930" emissive="#690713" emissiveIntensity={0.4} roughness={0.25} />
    </mesh>
  );
}
function Scene() {
  return (
    <>
      <ambientLight intensity={1.6} />
      <pointLight position={[4, 4, 5]} intensity={8} distance={12} color="#ff5264" />
      <pointLight position={[-4, -2, 4]} intensity={5} distance={10} color="#ffb1ba" />
      <BloodCell scale={1.48} position={[0, 0, 0]} />
      <Orbit radius={1.95} rotation={[1.15, 0.2, 0]} speed={0.12} opacity={0.4} />
      <Orbit radius={2.35} rotation={[0.45, 0.85, 0]} speed={-0.07} opacity={0.22} />
      <Orbit radius={2.7} rotation={[1.5, 0.15, 0.6]} speed={0.045} opacity={0.16} />
      <FloatingCell position={[2.45, 0.95, 0]} scale={0.16} speed={0.9} />
      <FloatingCell position={[-2.35, -0.75, 0.2]} scale={0.11} speed={0.7} />
      <FloatingCell position={[1.95, -1.55, -0.3]} scale={0.09} speed={0.8} />
      <FloatingCell position={[-1.75, 1.45, -0.4]} scale={0.075} speed={0.6} />
      <Sparkles count={55} scale={6} size={0.8} speed={0.15} color="#ff6c7b" />
    </>
  );
}
export default function Eligibility3D() {
  return (
    <div className="eligibility-3d">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 7], fov: 42 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
