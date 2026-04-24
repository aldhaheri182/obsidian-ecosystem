'use client';

import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { useOpenClawStore } from '@/store/openclawStore';
import { ROOMS, WORLD_BOUNDS } from '@/data/openclawRooms';

// Dev-time: expose a smoke-test hook on window. No-op in production.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__opx = {
    state: () => useOpenClawStore.getState(),
    teleport: (roomId: string) => {
      const r = ROOMS.find((x) => x.id === roomId);
      if (!r) return;
      useOpenClawStore.getState().setPlayerPos([r.center[0], 0, r.center[1] + 0.8]);
    },
  };
}

const WALK_SPEED = 4.5;
const RUN_SPEED = 7.5;
const PROXIMITY_RADIUS = 1.6;

// Player avatar — WASD / arrow keys. Axis-aligned world movement since
// the camera is fixed-isometric. Camera follows with smooth lerp.
export function Player() {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const setPlayerPos = useOpenClawStore((s) => s.setPlayerPos);
  const teleportTarget = useOpenClawStore((s) => s.playerPos);
  const setPlayerFacing = useOpenClawStore((s) => s.setPlayerFacing);
  const setNearest = useOpenClawStore((s) => s.setNearest);
  const openPanel = useOpenClawStore((s) => s.openPanel);
  const openPanelRoomId = useOpenClawStore((s) => s.openPanelRoomId);
  const nearestRoomId = useOpenClawStore((s) => s.nearestRoomId);
  const pushLog = useOpenClawStore((s) => s.pushLog);

  const keys = useMemo(
    () => ({ w: false, a: false, s: false, d: false, shift: false, e: false }),
    [],
  );

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.w = true;
      if (k === 's' || k === 'arrowdown') keys.s = true;
      if (k === 'a' || k === 'arrowleft') keys.a = true;
      if (k === 'd' || k === 'arrowright') keys.d = true;
      if (k === 'shift') keys.shift = true;
      if (k === 'e') {
        if (!keys.e && nearestRoomId) {
          const nextOpen = openPanelRoomId === nearestRoomId ? null : nearestRoomId;
          openPanel(nextOpen);
          if (nextOpen) {
            const room = ROOMS.find((r) => r.id === nextOpen);
            pushLog({
              time: new Date().toISOString().slice(11, 19),
              room: nextOpen,
              message: `Opened ${room?.name ?? nextOpen} terminal.`,
            });
          }
        }
        keys.e = true;
      }
      if (k === 'escape' && openPanelRoomId) {
        openPanel(null);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.w = false;
      if (k === 's' || k === 'arrowdown') keys.s = false;
      if (k === 'a' || k === 'arrowleft') keys.a = false;
      if (k === 'd' || k === 'arrowright') keys.d = false;
      if (k === 'shift') keys.shift = false;
      if (k === 'e') keys.e = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [keys, nearestRoomId, openPanelRoomId, openPanel, pushLog]);

  // Snap the 3D group to the store's playerPos when it diverges sharply
  // (teleport path). Small divergences caused by the useFrame-writes are
  // ignored.
  useEffect(() => {
    if (!group.current) return;
    const [tx, ty, tz] = teleportTarget;
    const dx = tx - group.current.position.x;
    const dz = tz - group.current.position.z;
    if (Math.hypot(dx, dz) > 2) {
      group.current.position.set(tx, ty, tz);
    }
  }, [teleportTarget]);

  const camOffset = useMemo(() => new THREE.Vector3(14, 16, 14), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredCamPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (!group.current) return;
    // Don't walk if the modal is open (better UX).
    const modalOpen = !!openPanelRoomId;

    let dx = 0;
    let dz = 0;
    if (!modalOpen) {
      if (keys.w) dz -= 1;
      if (keys.s) dz += 1;
      if (keys.a) dx -= 1;
      if (keys.d) dx += 1;
    }
    const mag = Math.hypot(dx, dz);
    if (mag > 0) {
      dx /= mag;
      dz /= mag;
      const speed = keys.shift ? RUN_SPEED : WALK_SPEED;
      group.current.position.x += dx * speed * dt;
      group.current.position.z += dz * speed * dt;
      const yaw = Math.atan2(dx, dz);
      if (body.current) body.current.rotation.y = yaw;
      setPlayerFacing(yaw);
    }

    // Clamp to world bounds
    group.current.position.x = Math.max(
      WORLD_BOUNDS.minX,
      Math.min(WORLD_BOUNDS.maxX, group.current.position.x),
    );
    group.current.position.z = Math.max(
      WORLD_BOUNDS.minZ,
      Math.min(WORLD_BOUNDS.maxZ, group.current.position.z),
    );

    const px = group.current.position.x;
    const py = group.current.position.y;
    const pz = group.current.position.z;
    setPlayerPos([px, py, pz]);

    // Proximity — nearest room centre within PROXIMITY_RADIUS
    let bestId: string | null = null;
    let bestD = PROXIMITY_RADIUS;
    for (const r of ROOMS) {
      const d = Math.hypot(r.center[0] - px, r.center[1] - pz);
      if (d < bestD) {
        bestD = d;
        bestId = r.id;
      }
    }
    if (bestId !== nearestRoomId) {
      setNearest(bestId);
    }

    // Walk anim
    const t = performance.now() * 0.01;
    const walking = mag > 0;
    if (legL.current && legR.current) {
      const sw = walking ? Math.sin(t * (keys.shift ? 1.4 : 1.0)) * 0.55 : 0;
      legL.current.rotation.x = sw;
      legR.current.rotation.x = -sw;
    }
    if (armL.current && armR.current) {
      const sw = walking ? Math.sin(t * (keys.shift ? 1.4 : 1.0)) * 0.5 : 0;
      armL.current.rotation.x = -sw * 0.7;
      armR.current.rotation.x = sw * 0.7;
    }
    if (body.current) {
      body.current.position.y =
        walking
          ? 0.05 + Math.abs(Math.sin(t * (keys.shift ? 2.0 : 1.6))) * 0.04
          : 0.05;
    }

    // Camera follow (lerp)
    desiredCamPos.set(px + camOffset.x, camOffset.y, pz + camOffset.z);
    camera.position.lerp(desiredCamPos, 0.08);
    camTarget.set(px, 0.8, pz);
    camera.lookAt(camTarget);
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      <group ref={body}>
        {/* Torso */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.32, 5, 12]} />
          <meshStandardMaterial color="#e7eaf2" roughness={0.55} metalness={0.1} />
        </mesh>
        {/* Cape / accent stripe */}
        <mesh position={[0, 0.38, -0.05]}>
          <boxGeometry args={[0.15, 0.3, 0.02]} />
          <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.4} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.66, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#f1d9b5" roughness={0.7} />
        </mesh>
        {/* Helmet visor */}
        <mesh position={[0, 0.68, 0.08]}>
          <boxGeometry args={[0.16, 0.03, 0.005]} />
          <meshStandardMaterial color="#00F5D4" emissive="#00F5D4" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        {/* Shoulders + arms */}
        <group ref={armL} position={[-0.15, 0.5, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.04, 0.22, 4, 8]} />
            <meshStandardMaterial color="#e7eaf2" />
          </mesh>
        </group>
        <group ref={armR} position={[0.15, 0.5, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.04, 0.22, 4, 8]} />
            <meshStandardMaterial color="#e7eaf2" />
          </mesh>
        </group>
        {/* Hips + legs */}
        <group ref={legL} position={[-0.06, 0.2, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
            <meshStandardMaterial color="#1f243b" />
          </mesh>
        </group>
        <group ref={legR} position={[0.06, 0.2, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
            <meshStandardMaterial color="#1f243b" />
          </mesh>
        </group>
      </group>
      {/* Ground glow under player */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial color="#00F5D4" transparent opacity={0.25} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
