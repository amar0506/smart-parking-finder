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

const COLS = 10;
const SLOT_W = 2.0;
const SLOT_D = 3.5;
const GAP = 0.35;
const CAR_COLORS = [0x3355cc, 0xcc3322, 0x22aa44, 0xddaa22, 0x993399, 0x22aacc];

function buildCar(colorHex: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5, roughness: 0.1 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.8 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 2.2), mat);
  body.position.y = 0.32;
  body.castShadow = true;
  g.add(body);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 1.3), mat);
  cabin.position.set(0, 0.65, -0.1);
  g.add(cabin);

  // Windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.26, 0.05), glassMat);
  windshield.position.set(0, 0.66, 0.56);
  windshield.rotation.x = -0.3;
  g.add(windshield);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 14);
  [[-0.66, 0, 0.75], [0.66, 0, 0.75], [-0.66, 0, -0.75], [0.66, 0, -0.75]].forEach(([x, y, z], i) => {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.2, z);
    w.castShadow = true;
    g.add(w);
    // Hub cap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8 }));
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x + (i % 2 === 0 ? -0.07 : 0.07), 0.2, z);
    g.add(hub);
  });

  // Headlights
  [[-0.4, 0.35, 1.11], [0.4, 0.35, 1.11]].forEach(([x, y, z]) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.04), lightMat);
    hl.position.set(x, y, z);
    g.add(hl);
  });

  // Taillights
  [[-0.4, 0.35, -1.11], [0.4, 0.35, -1.11]].forEach(([x, y, z]) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.04), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.5 }));
    tl.position.set(x, y, z);
    g.add(tl);
  });

  return g;
}

export default function Parking3D({ slots, onSlotClick }: Parking3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    animId: number;
    cleanup: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Ensure container has real dimensions
    const tryInit = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w < 10 || h < 10) return false;

      // ---- SCENE ----
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x080c1a);
      scene.fog = new THREE.FogExp2(0x080c1a, 0.018);

      const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 300);
      camera.position.set(0, 22, 26);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // ---- LIGHTS ----
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const sun = new THREE.DirectionalLight(0xffffff, 0.9);
      sun.position.set(15, 25, 15);
      sun.castShadow = true;
      sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
      sun.shadow.camera.far = 100;
      sun.shadow.mapSize.set(2048, 2048);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
      fill.position.set(-10, 10, -10);
      scene.add(fill);

      // ---- GROUND ----
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0.0 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.02;
      ground.receiveShadow = true;
      scene.add(ground);

      // Grid
      const grid = new THREE.GridHelper(80, 40, 0x1e3a5f, 0x0f1f33);
      grid.position.y = 0.005;
      scene.add(grid);

      // ---- SLOTS ----
      const displaySlots = slots.slice(0, 30);
      const slotMeshes: { mesh: THREE.Mesh; slotId: number; status: string }[] = [];

      displaySlots.forEach((slot, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = (col - COLS / 2 + 0.5) * (SLOT_W + GAP);
        const z = row * (SLOT_D + GAP) - 4;

        const isBooked = slot.status === "booked";
        const isMaintenance = slot.status === "maintenance";

        // Slot floor pad
        const padColor = isBooked ? 0x3d0a0a : isMaintenance ? 0x2a2a10 : 0x0a2a10;
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(SLOT_W - 0.05, 0.04, SLOT_D - 0.05),
          new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.9 })
        );
        pad.position.set(x, 0.02, z);
        pad.receiveShadow = true;
        pad.userData = { slotId: slot.id, status: slot.status, clickable: slot.status === "available" };
        scene.add(pad);
        slotMeshes.push({ mesh: pad, slotId: slot.id, status: slot.status });

        // Slot border (edge lines)
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(SLOT_W, 0.08, SLOT_D)),
          new THREE.LineBasicMaterial({
            color: isBooked ? 0xff3333 : isMaintenance ? 0xddaa00 : 0x22ff77
          })
        );
        edges.position.set(x, 0.04, z);
        scene.add(edges);

        // Status indicator sphere
        const indicatorColor = isBooked ? 0xff3333 : isMaintenance ? 0xddaa00 : 0x22ff77;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 10, 10),
          new THREE.MeshStandardMaterial({ color: indicatorColor, emissive: indicatorColor, emissiveIntensity: 0.6 })
        );
        dot.position.set(x - SLOT_W / 2 + 0.25, 0.4, z - SLOT_D / 2 + 0.25);
        scene.add(dot);

        // Pillar
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.0, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7, metalness: 0.5 })
        );
        pillar.position.set(x - SLOT_W / 2 + 0.12, 0.5, z - SLOT_D / 2 + 0.12);
        pillar.castShadow = true;
        scene.add(pillar);

        // Cars
        if (isBooked) {
          const car = buildCar(CAR_COLORS[i % CAR_COLORS.length]);
          car.position.set(x, 0, z);
          // Store animation start offset
          (car as any).__startZ = z - 10 - Math.random() * 5;
          (car as any).__targetZ = z;
          (car as any).__entered = false;
          (car as any).__t = 0;
          car.position.z = (car as any).__startZ;
          car.castShadow = true;
          scene.add(car);
        }
      });

      // ---- MOUSE / ORBIT ----
      let isDragging = false;
      let prevMouse = { x: 0, y: 0 };
      let theta = Math.PI / 6;
      let phi = Math.PI / 4;
      const radius = 32;
      let targetTheta = theta, targetPhi = phi;

      const updateCamera = () => {
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(0, 0, 0);
      };
      updateCamera();

      const onMouseDown = (e: MouseEvent) => {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = (e.clientX - prevMouse.x) * 0.005;
        const dy = (e.clientY - prevMouse.y) * 0.004;
        targetTheta -= dx;
        targetPhi = Math.max(0.2, Math.min(Math.PI / 2.2, targetPhi + dy));
        prevMouse = { x: e.clientX, y: e.clientY };
      };
      const onMouseUp = () => { isDragging = false; };

      // Touch support
      let lastTouch = { x: 0, y: 0 };
      const onTouchStart = (e: TouchEvent) => {
        isDragging = true;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      };
      const onTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        const dx = (e.touches[0].clientX - lastTouch.x) * 0.006;
        const dy = (e.touches[0].clientY - lastTouch.y) * 0.004;
        targetTheta -= dx;
        targetPhi = Math.max(0.2, Math.min(Math.PI / 2.2, targetPhi + dy));
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      };
      const onTouchEnd = () => { isDragging = false; };

      // Click for slot booking
      const raycaster = new THREE.Raycaster();
      const mouse2D = new THREE.Vector2();
      let mouseDownPos = { x: 0, y: 0 };
      const onPointerDown = (e: MouseEvent) => { mouseDownPos = { x: e.clientX, y: e.clientY }; };
      const onPointerUp = (e: MouseEvent) => {
        const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
        if (dist > 5) return; // Was a drag
        const rect = container.getBoundingClientRect();
        mouse2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse2D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse2D, camera);
        const meshes = slotMeshes.filter(s => s.status === "available").map(s => s.mesh);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length > 0 && onSlotClick) {
          onSlotClick(hits[0].object.userData.slotId);
        }
      };

      container.addEventListener("mousedown", onMouseDown);
      container.addEventListener("mousedown", onPointerDown);
      container.addEventListener("mousemove", onMouseMove);
      container.addEventListener("mouseup", onMouseUp);
      container.addEventListener("mouseup", onPointerUp);
      container.addEventListener("touchstart", onTouchStart);
      container.addEventListener("touchmove", onTouchMove);
      container.addEventListener("touchend", onTouchEnd);
      window.addEventListener("mouseup", onMouseUp);

      // ---- ANIMATE ----
      let animId = 0;
      let autoTheta = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);

        // Auto rotate slowly when not dragging
        if (!isDragging) {
          autoTheta += 0.003;
          targetTheta = autoTheta;
        } else {
          autoTheta = theta;
        }

        theta += (targetTheta - theta) * 0.08;
        phi += (targetPhi - phi) * 0.08;
        updateCamera();

        // Animate cars entering
        const t = Date.now() * 0.001;
        scene.children.forEach(child => {
          if ((child as any).__targetZ !== undefined) {
            const car = child as any;
            if (!car.__entered) {
              car.__t = Math.min(1, car.__t + 0.012);
              const eased = 1 - Math.pow(1 - car.__t, 3);
              car.position.z = car.__startZ + (car.__targetZ - car.__startZ) * eased;
              if (car.__t >= 1) car.__entered = true;
            }
          }
          // Pulse emissive indicators
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.4 + 0.3 * Math.sin(t * 2.5 + child.position.x);
          }
        });

        renderer.render(scene, camera);
      };
      animate();
      stateRef.current = { renderer, animId, cleanup: () => {} };

      // Resize
      const onResize = () => {
        const nw = container.clientWidth, nh = container.clientHeight;
        if (nw < 10 || nh < 10) return;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(container);

      stateRef.current.cleanup = () => {
        cancelAnimationFrame(animId);
        ro.disconnect();
        container.removeEventListener("mousedown", onMouseDown);
        container.removeEventListener("mousedown", onPointerDown);
        container.removeEventListener("mousemove", onMouseMove);
        container.removeEventListener("mouseup", onMouseUp);
        container.removeEventListener("mouseup", onPointerUp);
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchmove", onTouchMove);
        container.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("mouseup", onMouseUp);
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };

      return true;
    };

    // Try immediately, retry if container not sized yet
    if (!tryInit()) {
      const ro = new ResizeObserver(() => {
        if (tryInit()) ro.disconnect();
      });
      ro.observe(container);
      return () => ro.disconnect();
    }

    return () => {
      stateRef.current?.cleanup();
      stateRef.current = null;
    };
  }, [slots, onSlotClick]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: "grab" }}
      title="Drag to rotate · Click green slot to book"
    />
  );
}
