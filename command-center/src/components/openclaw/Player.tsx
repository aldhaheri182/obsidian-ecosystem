'use client';

import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { useOpenClawStore } from '@/store/openclawStore';
import { ROOMS, WORLD_BOUNDS, PLAYER_SPAWN } from '@/data/openclawRooms';

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
  const rimLight = useRef<THREE.PointLight>(null);
  const groundRingA = useRef<THREE.Mesh>(null);
  const groundRingB = useRef<THREE.Mesh>(null);
  const aura = useRef<THREE.Mesh>(null);
  const capeMat = useRef<THREE.MeshStandardMaterial>(null);
  const visorMat = useRef<THREE.MeshStandardMaterial>(null);
  const trailRefs = useRef<Array<THREE.Mesh | null>>([]);
  const trailPositions = useRef<Array<[number, number, number]>>(
    Array.from({ length: 8 }, () => [0, 0, 0]),
  );
  const { camera } = useThree();

  const setPlayerPos = useOpenClawStore((s) => s.setPlayerPos);
  const teleportTarget = useOpenClawStore((s) => s.playerPos);
  const setPlayerFacing = useOpenClawStore((s) => s.setPlayerFacing);
  const setNearest = useOpenClawStore((s) => s.setNearest);
  const openPanel = useOpenClawStore((s) => s.openPanel);
  const openPanelRoomId = useOpenClawStore((s) => s.openPanelRoomId);
  const nearestRoomId = useOpenClawStore((s) => s.nearestRoomId);
  const pushLog = useOpenClawStore((s) => s.pushLog);
  const discoverRoom = useOpenClawStore((s) => s.discoverRoom);
  const pushToast = useOpenClawStore((s) => s.pushToast);
  const selectAgent = useOpenClawStore((s) => s.selectAgent);
  const cameraMode = useOpenClawStore((s) => s.cameraMode);
  const toggleCameraMode = useOpenClawStore((s) => s.toggleCameraMode);

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
      if (k === 'escape') {
        if (openPanelRoomId) openPanel(null);
        selectAgent(null);
      }
      // Zoom keys: +/= zoom in, -/_ zoom out, 0 reset to default
      if (k === '+' || k === '=') {
        e.preventDefault();
        useOpenClawStore.getState().nudgeZoom(-0.08);
      }
      if (k === '-' || k === '_') {
        e.preventDefault();
        useOpenClawStore.getState().nudgeZoom(0.08);
      }
      if (k === '0') {
        e.preventDefault();
        useOpenClawStore.getState().setZoom(1);
      }
      // V — toggle POV / Command Map
      if (k === 'v') {
        e.preventDefault();
        toggleCameraMode();
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
    // Mouse wheel — smooth proportional zoom. deltaY > 0 = scroll down
    // = zoom out; deltaY < 0 = scroll up = zoom in.
    const onWheel = (e: WheelEvent) => {
      // Ignore if the wheel is over a scrollable HUD panel
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest('[data-allow-scroll]')) return;
      e.preventDefault();
      const step = e.deltaY * 0.0015;
      useOpenClawStore.getState().nudgeZoom(step);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, [keys, nearestRoomId, openPanelRoomId, openPanel, pushLog, selectAgent, toggleCameraMode]);

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

  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredCamPos = useMemo(() => new THREE.Vector3(), []);
  // Accumulated facing yaw used in POV mode (A/D rotate the camera).
  const yawRef = useRef(0);

  // Switch FOV when cameraMode changes — wider for POV, narrow for map.
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (!('fov' in persp)) return;
    persp.fov = cameraMode === 'pov' ? 72 : 35;
    persp.updateProjectionMatrix();
  }, [cameraMode, camera]);

  useFrame((_, dt) => {
    if (!group.current) return;
    // Don't walk if the modal is open (better UX).
    const modalOpen = !!openPanelRoomId;
    const mode = useOpenClawStore.getState().cameraMode;

    if (mode === 'pov') {
      // POV movement — W/S move forward/backward along facing, A/D turn.
      const TURN_RATE = 2.6; // rad/s
      if (!modalOpen) {
        if (keys.a) yawRef.current -= TURN_RATE * dt;
        if (keys.d) yawRef.current += TURN_RATE * dt;
      }
      let mv = 0;
      if (!modalOpen) {
        if (keys.w) mv -= 1;
        if (keys.s) mv += 1;
      }
      if (mv !== 0) {
        const speed = keys.shift ? RUN_SPEED : WALK_SPEED;
        const yaw = yawRef.current;
        group.current.position.x += Math.sin(yaw) * mv * speed * dt;
        group.current.position.z += Math.cos(yaw) * mv * speed * dt;
      }
      if (body.current) body.current.rotation.y = yawRef.current;
      setPlayerFacing(yawRef.current);
    } else {
      // Command-map movement — axis-aligned WASD, facing follows motion.
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
        yawRef.current = yaw;
        if (body.current) body.current.rotation.y = yaw;
        setPlayerFacing(yaw);
      }
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
      // First time discovering — toast + discovery log
      if (bestId) {
        const state = useOpenClawStore.getState();
        if (!state.discoveredRooms.has(bestId)) {
          discoverRoom(bestId);
          const room = ROOMS.find((r) => r.id === bestId);
          if (room) {
            pushToast({
              kind: 'discover',
              accent: room.accent,
              title: `ROOM DISCOVERED — ${room.name}`,
              subtitle: room.codename,
            });
            pushLog({
              time: new Date().toISOString().slice(11, 19),
              room: bestId,
              message: `Entered proximity of ${room.name} — ${room.codename}.`,
            });
          }
        }
      }
    }

    // Walk anim
    const t = performance.now() * 0.01;
    const tSec = performance.now() * 0.001;
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

    // Rim light follows the player — keeps avatar readable from every angle
    if (rimLight.current) {
      rimLight.current.intensity = 1.6 + (walking ? 0.8 : 0) + Math.sin(tSec * 2.4) * 0.15;
    }
    // Expanding ground pulse rings — always on, stronger when moving
    const ringBaseSpeed = walking ? (keys.shift ? 1.8 : 1.3) : 0.7;
    [groundRingA.current, groundRingB.current].forEach((m, idx) => {
      if (!m) return;
      const phase = ((tSec * ringBaseSpeed + idx * 0.5) % 1);
      const s = 0.6 + phase * 1.8;
      m.scale.set(s, s, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.75;
    });
    if (aura.current) {
      aura.current.scale.setScalar(1 + Math.sin(tSec * 1.8) * 0.08);
      const mat = aura.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28 + (walking ? 0.1 : 0) + Math.sin(tSec * 1.8) * 0.05;
    }
    if (capeMat.current) {
      capeMat.current.emissiveIntensity = 0.8 + (walking ? 0.6 : 0);
    }
    if (visorMat.current) {
      visorMat.current.emissiveIntensity = 2.6 + Math.sin(tSec * 3.1) * 0.4;
    }

    // Energy trail — shift newest position to head, fade tail
    if (walking) {
      const positions = trailPositions.current;
      for (let i = positions.length - 1; i > 0; i--) {
        positions[i] = positions[i - 1];
      }
      positions[0] = [px, 0.04, pz];
    }
    trailRefs.current.forEach((m, i) => {
      if (!m) return;
      const [tx, ty, tz] = trailPositions.current[i];
      // Trail meshes live inside the player group — convert world → local
      m.position.set(tx - px, ty, tz - pz);
      const mat = m.material as THREE.MeshBasicMaterial;
      const fade = 1 - i / trailRefs.current.length;
      mat.opacity = walking ? fade * 0.6 : mat.opacity * 0.92;
      const s = 0.3 + fade * 0.4;
      m.scale.set(s, s, 1);
    });

    if (mode === 'pov') {
      // First-person camera at player head height, looking forward.
      const HEAD_Y = 1.1;
      const yaw = yawRef.current;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      desiredCamPos.set(px, HEAD_Y, pz);
      camera.position.lerp(desiredCamPos, 0.65);
      camTarget.set(px + fx * 3, HEAD_Y - 0.08, pz + fz * 3);
      camera.lookAt(camTarget);
    } else {
      // Command-map camera — pulled-back strategy overview; wheel/+/−
      // zooms in (down to ~0.18) toward the player's room.
      const breathe = Math.sin(tSec * 0.7) * 0.12;
      const zoom = useOpenClawStore.getState().zoom;
      // Blend factor: 0 at zoom=1, 1 at zoom=0.18
      const blend = Math.min(1, Math.max(0, (1 - zoom) / (1 - 0.18)));
      const tx = px * blend;
      const tz = pz * blend;
      desiredCamPos.set(tx, 32 * zoom + breathe, tz + 22 * zoom + breathe * 0.5);
      camera.position.lerp(desiredCamPos, 0.08);
      camTarget.set(tx, 0, tz);
      camera.lookAt(camTarget);
    }
  });

  return (
    <group ref={group} position={PLAYER_SPAWN}>
      <group ref={body} visible={cameraMode !== 'pov'}>
        {/* Torso */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.32, 5, 12]} />
          <meshStandardMaterial color="#e7eaf2" roughness={0.55} metalness={0.1} />
        </mesh>
        {/* Cape / accent stripe — wider, brighter, more game-like */}
        <mesh position={[0, 0.4, -0.06]}>
          <boxGeometry args={[0.2, 0.38, 0.02]} />
          <meshStandardMaterial ref={capeMat} color="#FFD166" emissive="#FFD166" emissiveIntensity={1.0} toneMapped={false} />
        </mesh>
        {/* Shoulder pauldrons — readable silhouette from iso angle */}
        <mesh position={[-0.17, 0.54, 0]} castShadow>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.6} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.17, 0.54, 0]} castShadow>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.6} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.66, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#f1d9b5" roughness={0.7} />
        </mesh>
        {/* Helmet visor — larger, brighter */}
        <mesh position={[0, 0.68, 0.08]}>
          <boxGeometry args={[0.18, 0.04, 0.008]} />
          <meshStandardMaterial ref={visorMat} color="#00F5D4" emissive="#00F5D4" emissiveIntensity={2.8} toneMapped={false} />
        </mesh>
        {/* Back chevron emitter */}
        <mesh position={[0, 0.46, -0.09]}>
          <boxGeometry args={[0.08, 0.05, 0.02]} />
          <meshBasicMaterial color="#00F5D4" toneMapped={false} />
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
      {/* Solid ground glow under player */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#00F5D4" transparent opacity={0.42} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Wider halo disc */}
      <mesh ref={aura} position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.9, 48]} />
        <meshBasicMaterial color="#00F5D4" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Two pulsing expanding rings */}
      <mesh ref={groundRingA} position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.44, 48]} />
        <meshBasicMaterial color="#00F5D4" transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={groundRingB} position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.44, 48]} />
        <meshBasicMaterial color="#FFD166" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Attached rim pointLight — keeps avatar lit against darker floor */}
      <pointLight
        ref={rimLight}
        color="#00F5D4"
        intensity={1.8}
        distance={3.6}
        decay={1.5}
        position={[0, 0.9, 0]}
      />
      {/* Energy trail motes (world-space, fed by useFrame) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.12, 18]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#00F5D4' : '#FFD166'}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
