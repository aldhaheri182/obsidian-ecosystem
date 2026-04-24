'use client';

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { useEcosystemStore } from '@/store/ecosystemStore';

// Spec §8:
// Default (8,14,18) looking at (0,1,0). Auto-rotate after 5s idle at 0.05 rad/s.
// minDistance 8, maxDistance 30, maxPolarAngle PI/2.5, minPolarAngle PI/4.
// enablePan false. Click city → GSAP camera to 4u in front; Esc / dblclick → default.
export function CameraController() {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const selectedCityId = useEcosystemStore((s) => s.selectedCityId);
  const selectCity = useEcosystemStore((s) => s.selectCity);
  const cities = useEcosystemStore((s) => s.cities);

  // Animate to selected city
  useEffect(() => {
    if (!controlsRef.current) return;
    if (!selectedCityId) {
      gsap.to(camera.position, { x: 8, y: 14, z: 18, duration: 1.2, ease: 'power3.out' });
      gsap.to(controlsRef.current.target, { x: 0, y: 1, z: 0, duration: 1.2, ease: 'power3.out' });
      controlsRef.current.autoRotate = false;
      return;
    }
    const c = cities.find((x) => x.id === selectedCityId);
    if (!c) return;
    const [cx, , cz] = c.position;
    // Position 4 units "in front of" the chamber = toward center + a little up.
    const lenFromCenter = Math.hypot(cx, cz);
    const dirX = cx / lenFromCenter;
    const dirZ = cz / lenFromCenter;
    // Camera: 4u outward from chamber along the outward normal, at elevation 2.
    const camX = cx + dirX * 4;
    const camZ = cz + dirZ * 4;
    gsap.to(camera.position, { x: camX, y: 2.5, z: camZ, duration: 1.2, ease: 'power3.inOut' });
    gsap.to(controlsRef.current.target, { x: cx, y: 0.8, z: cz, duration: 1.2, ease: 'power3.inOut' });
    controlsRef.current.autoRotate = false;
  }, [selectedCityId, cities, camera]);

  // Auto-rotate after 5s of idle interaction
  useEffect(() => {
    if (!controlsRef.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const resetIdle = () => {
      if (timer) clearTimeout(timer);
      if (controlsRef.current) controlsRef.current.autoRotate = false;
      timer = setTimeout(() => {
        if (controlsRef.current && !selectedCityId) {
          controlsRef.current.autoRotate = true;
        }
      }, 5000);
    };
    resetIdle();
    const el = document.body;
    el.addEventListener('pointermove', resetIdle);
    el.addEventListener('wheel', resetIdle);
    el.addEventListener('pointerdown', resetIdle);
    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener('pointermove', resetIdle);
      el.removeEventListener('wheel', resetIdle);
      el.removeEventListener('pointerdown', resetIdle);
    };
  }, [selectedCityId]);

  // ESC deselect; double-click empty-space deselect
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') selectCity(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectCity]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      minDistance={8}
      maxDistance={30}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.5}
      autoRotateSpeed={0.05 * 60}
      target={[0, 1, 0] as unknown as THREE.Vector3}
    />
  );
}
