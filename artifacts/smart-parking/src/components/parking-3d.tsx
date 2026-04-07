import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Slot {
  id: number;
  slotNumber: string;
  status: string;
  floor: string;
}

interface Parking3DProps {
  slots: Slot[];
  onSlotClick?: (slotId: number) => void;
}

const SLOT_W = 2.2;
const SLOT_D = 3.8;
const GAP = 0.4;
const COLS = 10;
const CAR_COLORS = [0x2255cc, 0xcc2211, 0x119944, 0xddbb22, 0x8833cc, 0x22aacc, 0xcc6622, 0x226644];

function makeCar(color: number): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x88bbff, transparent: true, opacity: 0.45, roughness: 0.1 });
  const headlight = new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffaa, emissiveIntensity: 1.0 });
  const taillight = new THREE.MeshStandardMaterial({ color: 0xff2211, emissive: 0xff1100, emissiveIntensity: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.05 });

  // Lower body (wider)
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.28, 2.3), body);
  lowerBody.position.y = 0.24;
  lowerBody.castShadow = true;
  g.add(lowerBody);

  // Upper body / cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.32, 1.4), body);
  cabin.position.set(0, 0.58, -0.06);
  cabin.castShadow = true;
  g.add(cabin);

  // Windshield front
  const wsF = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.28), glass);
  wsF.position.set(0, 0.6, 0.56);
  wsF.rotation.x = -0.35;
  g.add(wsF);
  // Windshield rear
  const wsR = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.25), glass);
  wsR.position.set(0, 0.6, -0.76);
  wsR.rotation.x = 0.35;
  g.add(wsR);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.17, 16);
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.19, 8);
  const wheelPos: [number, number, number][] = [
    [-0.68, 0.22, 0.82], [0.68, 0.22, 0.82],
    [-0.68, 0.22, -0.82], [0.68, 0.22, -0.82]
  ];
  wheelPos.forEach(([x, y, z], i) => {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.castShadow = true;
    g.add(w);
    const hub = new THREE.Mesh(hubGeo, chrome);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x + (i % 2 === 0 ? -0.09 : 0.09), y, z);
    g.add(hub);
  });

  // Headlights
  [[-0.42, 0.3, 1.15], [0.42, 0.3, 1.15]].forEach(([x, y, z]) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.04), headlight);
    hl.position.set(x, y, z);
    g.add(hl);
  });
  // Taillights
  [[-0.42, 0.3, -1.15], [0.42, 0.3, -1.15]].forEach(([x, y, z]) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.04), taillight);
    tl.position.set(x, y, z);
    g.add(tl);
  });

  // Bumpers
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.08), chrome);
  bumperF.position.set(0, 0.12, 1.17);
  g.add(bumperF);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.08), chrome);
  bumperR.position.set(0, 0.12, -1.17);
  g.add(bumperR);

  return g;
}

export default function Parking3D({ slots, onSlotClick }: Parking3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;

    const container = mountRef.current;
    if (!container) return;

    const init = (): (() => void) | null => {
      const W = container.clientWidth;
      const H = container.clientHeight;
      if (W < 20 || H < 20) return null;

      // ── Renderer ──
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);

      // ── Scene ──
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x060a18);
      scene.fog = new THREE.FogExp2(0x060a18, 0.015);

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 400);

      // Orbit state
      let theta = Math.PI / 5;
      let phi = Math.PI / 3.5;
      let radius = 36;
      const TARGET = new THREE.Vector3(0, 0, 0);
      const MIN_RADIUS = 12, MAX_RADIUS = 80;
      const MIN_PHI = 0.15, MAX_PHI = Math.PI / 2.1;

      const syncCamera = () => {
        camera.position.set(
          TARGET.x + radius * Math.sin(phi) * Math.sin(theta),
          TARGET.y + radius * Math.cos(phi),
          TARGET.z + radius * Math.sin(phi) * Math.cos(theta),
        );
        camera.lookAt(TARGET);
      };
      syncCamera();

      // ── Lights ──
      scene.add(new THREE.AmbientLight(0xffffff, 0.3));

      const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
      sun.position.set(20, 35, 20);
      sun.castShadow = true;
      sun.shadow.mapSize.setScalar(2048);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 120;
      sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
      sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
      scene.add(sun);

      const fill = new THREE.DirectionalLight(0x4466ff, 0.35);
      fill.position.set(-15, 15, -15);
      scene.add(fill);

      const hemi = new THREE.HemisphereLight(0x223366, 0x111111, 0.4);
      scene.add(hemi);

      // ── Ground ──
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d1525, roughness: 0.92, metalness: 0.08 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      ground.receiveShadow = true;
      scene.add(ground);

      // Grid
      scene.add(new THREE.GridHelper(120, 60, 0x1a3060, 0x0c1a38));

      // ── Parking Slots ──
      const displaySlots = slots.slice(0, 30);
      const clickableMeshes: THREE.Mesh[] = [];
      const cars: Array<{ group: THREE.Group; targetZ: number; t: number; done: boolean }> = [];

      displaySlots.forEach((slot, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = (col - COLS / 2 + 0.5) * (SLOT_W + GAP);
        const z = row * (SLOT_D + GAP) - (Math.floor(displaySlots.length / COLS) / 2) * (SLOT_D + GAP);

        const isBooked = slot.status === "booked";
        const isMaint = slot.status === "maintenance";
        const edgeColor = isBooked ? 0xff3333 : isMaint ? 0xddaa00 : 0x22ff88;
        const padColor = isBooked ? 0x300808 : isMaint ? 0x1a1a00 : 0x082808;

        // Floor pad
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(SLOT_W - 0.08, 0.05, SLOT_D - 0.08),
          new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.95 })
        );
        pad.position.set(x, 0.025, z);
        pad.receiveShadow = true;
        pad.userData = { slotId: slot.id, status: slot.status };
        scene.add(pad);
        if (slot.status === "available") clickableMeshes.push(pad);

        // Edge highlight
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(SLOT_W, 0.06, SLOT_D)),
          new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 1 })
        );
        edges.position.set(x, 0.05, z);
        scene.add(edges);

        // Status orb
        const orbMat = new THREE.MeshStandardMaterial({ color: edgeColor, emissive: edgeColor, emissiveIntensity: 0.7 });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), orbMat);
        orb.position.set(x - SLOT_W / 2 + 0.22, 0.55, z - SLOT_D / 2 + 0.22);
        orb.userData.isOrb = true;
        orb.userData.baseX = x;
        scene.add(orb);

        // Pillar
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 1.1, 0.14),
          new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.65, metalness: 0.55 })
        );
        pillar.position.set(x - SLOT_W / 2 + 0.14, 0.55, z - SLOT_D / 2 + 0.14);
        pillar.castShadow = true;
        scene.add(pillar);

        // Point light for booked slots
        if (isBooked) {
          const pl = new THREE.PointLight(0xff4422, 0.4, 4);
          pl.position.set(x, 1.2, z);
          scene.add(pl);
        } else if (!isMaint) {
          const pl = new THREE.PointLight(0x22ff66, 0.25, 4);
          pl.position.set(x, 1.2, z);
          scene.add(pl);
        }

        // Cars for booked slots
        if (isBooked) {
          const car = makeCar(CAR_COLORS[i % CAR_COLORS.length]);
          const startZ = z - 12 - Math.random() * 4;
          car.position.set(x, 0, startZ);
          car.castShadow = true;
          scene.add(car);
          cars.push({ group: car, targetZ: z, t: Math.random() * 0.3, done: false });
        }
      });

      // ── Orbit controls ──
      let isDragging = false;
      let downPos = { x: 0, y: 0 };
      let lastPos = { x: 0, y: 0 };
      let tTarget = theta, pTarget = phi, rTarget = radius;
      let autoTheta = theta;

      const onPD = (e: PointerEvent) => {
        isDragging = true;
        downPos = { x: e.clientX, y: e.clientY };
        lastPos = { x: e.clientX, y: e.clientY };
        container.setPointerCapture(e.pointerId);
      };
      const onPM = (e: PointerEvent) => {
        if (!isDragging) return;
        tTarget -= (e.clientX - lastPos.x) * 0.006;
        pTarget = Math.max(MIN_PHI, Math.min(MAX_PHI, pTarget + (e.clientY - lastPos.y) * 0.005));
        lastPos = { x: e.clientX, y: e.clientY };
      };
      const onPU = (e: PointerEvent) => {
        const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        isDragging = false;
        autoTheta = tTarget; // continue auto-rotate from here

        // Click detection — only if barely moved
        if (moved < 6 && onSlotClick) {
          const rect = container.getBoundingClientRect();
          const m = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          const ray = new THREE.Raycaster();
          ray.setFromCamera(m, camera);
          const hits = ray.intersectObjects(clickableMeshes);
          if (hits.length > 0) onSlotClick(hits[0].object.userData.slotId);
        }
      };

      // Scroll to zoom
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        rTarget = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, rTarget + e.deltaY * 0.04));
      };

      // Touch orbit
      let lastTouchDist = 0;
      const onTStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isDragging = true;
          lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          downPos = { ...lastPos };
        } else if (e.touches.length === 2) {
          lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      };
      const onTMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          tTarget -= (e.touches[0].clientX - lastPos.x) * 0.006;
          pTarget = Math.max(MIN_PHI, Math.min(MAX_PHI, pTarget + (e.touches[0].clientY - lastPos.y) * 0.005));
          lastPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          rTarget = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, rTarget - (dist - lastTouchDist) * 0.08));
          lastTouchDist = dist;
        }
      };
      const onTEnd = () => { isDragging = false; autoTheta = tTarget; };

      container.addEventListener("pointerdown", onPD);
      container.addEventListener("pointermove", onPM);
      container.addEventListener("pointerup", onPU);
      container.addEventListener("wheel", onWheel, { passive: false });
      container.addEventListener("touchstart", onTStart, { passive: true });
      container.addEventListener("touchmove", onTMove, { passive: false });
      container.addEventListener("touchend", onTEnd);

      // ── Animation loop ──
      let animId = 0;
      const clock = new THREE.Clock();

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();

        // Auto-rotate when idle
        if (!isDragging) {
          autoTheta += 0.003;
          tTarget = autoTheta;
        }

        // Smooth interpolation
        theta += (tTarget - theta) * 0.07;
        phi += (pTarget - phi) * 0.07;
        radius += (rTarget - radius) * 0.1;

        syncCamera();

        // Car entry animation
        cars.forEach(entry => {
          if (entry.done) return;
          entry.t = Math.min(1, entry.t + 0.01);
          const eased = 1 - (1 - entry.t) ** 3;
          entry.group.position.z = entry.targetZ - 12 + 12 * eased;
          if (entry.t >= 1) { entry.group.position.z = entry.targetZ; entry.done = true; }
        });

        // Pulse orbs
        scene.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.userData?.isOrb) {
            const m = child.material as THREE.MeshStandardMaterial;
            m.emissiveIntensity = 0.45 + 0.35 * Math.sin(elapsed * 2.2 + child.userData.baseX * 1.3);
          }
        });

        renderer.render(scene, camera);
      };
      animate();

      // ── Resize ──
      const ro = new ResizeObserver(() => {
        const nw = container.clientWidth, nh = container.clientHeight;
        if (nw < 20 || nh < 20) return;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      });
      ro.observe(container);

      return () => {
        cancelAnimationFrame(animId);
        ro.disconnect();
        container.removeEventListener("pointerdown", onPD);
        container.removeEventListener("pointermove", onPM);
        container.removeEventListener("pointerup", onPU);
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("touchstart", onTStart);
        container.removeEventListener("touchmove", onTMove);
        container.removeEventListener("touchend", onTEnd);
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    };

    // Init immediately or wait for dimensions
    const cleanup = init();
    if (cleanup) {
      cleanupRef.current = cleanup;
    } else {
      const ro = new ResizeObserver(() => {
        const c = init();
        if (c) { cleanupRef.current = c; ro.disconnect(); }
      });
      ro.observe(container);
      return () => ro.disconnect();
    }

    return () => { cleanupRef.current?.(); cleanupRef.current = null; };
  }, [slots, onSlotClick]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full select-none"
      style={{ cursor: "grab", touchAction: "none" }}
    />
  );
}
