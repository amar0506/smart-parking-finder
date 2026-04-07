import { useEffect, useRef, useMemo } from "react";
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

export default function Parking3D({ slots, onSlotClick }: Parking3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    animationId: number;
    slotMeshes: Map<number, THREE.Mesh>;
    carMeshes: Map<number, THREE.Group>;
  } | null>(null);

  const floorSlots = useMemo(() => {
    const map = new Map<string, Slot[]>();
    slots.forEach(s => {
      if (!map.has(s.floor)) map.set(s.floor, []);
      map.get(s.floor)!.push(s);
    });
    return map;
  }, [slots]);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025);

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    camera.position.set(0, 18, 20);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Blue accent light
    const blueLight = new THREE.PointLight(0x4488ff, 1, 30);
    blueLight.position.set(-5, 5, 5);
    scene.add(blueLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(40, 20, 0x223366, 0x111133);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const slotMeshes = new Map<number, THREE.Mesh>();
    const carMeshes = new Map<number, THREE.Group>();

    const slotW = 2.2;
    const slotD = 3.8;
    const gap = 0.4;

    let allSlots: Slot[] = [];
    floorSlots.forEach(s => allSlots = allSlots.concat(s));

    const cols = 10;
    allSlots.slice(0, 30).forEach((slot, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - cols / 2 + 0.5) * (slotW + gap);
      const z = row * (slotD + gap) - 5;

      const isBooked = slot.status === "booked";
      const isMaintenance = slot.status === "maintenance";

      // Ground marking
      const markGeo = new THREE.PlaneGeometry(slotW, slotD);
      const markMat = new THREE.MeshStandardMaterial({
        color: isBooked ? 0x661111 : isMaintenance ? 0x333333 : 0x114411,
        roughness: 0.8,
        metalness: 0.1,
      });
      const mark = new THREE.Mesh(markGeo, markMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, 0, z);
      mark.receiveShadow = true;
      mark.userData = { slotId: slot.id, status: slot.status };
      scene.add(mark);
      slotMeshes.set(slot.id, mark);

      // Slot border lines
      const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(slotW, 0.05, slotD));
      const borderMat = new THREE.LineBasicMaterial({
        color: isBooked ? 0xff3333 : isMaintenance ? 0x555555 : 0x33ff77,
        linewidth: 1,
      });
      const border = new THREE.LineSegments(borderGeo, borderMat);
      border.position.set(x, 0.02, z);
      scene.add(border);

      // Glow cylinder for available slots
      if (!isBooked && !isMaintenance) {
        const glowGeo = new THREE.CylinderGeometry(slotW * 0.3, slotW * 0.3, 0.05, 16);
        const glowMat = new THREE.MeshStandardMaterial({
          color: 0x00ff66,
          emissive: 0x00ff44,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.4,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(x, 0.1, z);
        scene.add(glow);
      }

      // Slot number label (pillar)
      const pillarGeo = new THREE.BoxGeometry(0.15, 1.2, 0.15);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x334466,
        roughness: 0.6,
        metalness: 0.4,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x - slotW / 2 + 0.2, 0.6, z - slotD / 2 + 0.2);
      pillar.castShadow = true;
      scene.add(pillar);

      // Car model for booked slots
      if (isBooked) {
        const carGroup = new THREE.Group();

        // Car body
        const bodyGeo = new THREE.BoxGeometry(1.3, 0.4, 2.4);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: [0x3355cc, 0xcc3322, 0x22aa44, 0xccaa22, 0x993399][i % 5],
          roughness: 0.3,
          metalness: 0.6,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.35;
        body.castShadow = true;
        carGroup.add(body);

        // Car roof
        const roofGeo = new THREE.BoxGeometry(1.0, 0.32, 1.5);
        const roof = new THREE.Mesh(roofGeo, bodyMat);
        roof.position.set(0, 0.71, -0.1);
        roof.castShadow = true;
        carGroup.add(roof);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const wheelPositions = [[-0.7, 0, 0.8], [0.7, 0, 0.8], [-0.7, 0, -0.8], [0.7, 0, -0.8]];
        wheelPositions.forEach(([wx, wy, wz]) => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(wx, 0.22, wz);
          carGroup.add(wheel);
        });

        // Headlights
        const hlGeo = new THREE.BoxGeometry(0.25, 0.12, 0.05);
        const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 0.8 });
        [-0.45, 0.45].forEach(hx => {
          const hl = new THREE.Mesh(hlGeo, hlMat);
          hl.position.set(hx, 0.38, 1.22);
          carGroup.add(hl);
        });

        carGroup.position.set(x, 0, z);
        scene.add(carGroup);
        carMeshes.set(slot.id, carGroup);
      }
    });

    // Animate cars entering (staggered)
    carMeshes.forEach((carGroup, slotId) => {
      const targetZ = carGroup.position.z;
      carGroup.position.z = targetZ - 8;
      let progress = Math.random();
      (carGroup as any).__enterProgress = progress;
      (carGroup as any).__targetZ = targetZ;
    });

    // Raycaster for click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(slotMeshes.values());
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        if (mesh.userData.status === "available" && onSlotClick) {
          onSlotClick(mesh.userData.slotId);
        }
      }
    };
    container.addEventListener("click", handleClick);

    // Orbit-like auto rotation
    let theta = 0;

    const animate = () => {
      const id = requestAnimationFrame(animate);
      (sceneRef.current as any).animationId = id;

      theta += 0.002;
      camera.position.x = Math.sin(theta) * 22;
      camera.position.z = Math.cos(theta) * 22;
      camera.lookAt(0, 0, 0);

      // Animate car entry
      carMeshes.forEach((carGroup) => {
        const progress: number = (carGroup as any).__enterProgress;
        const targetZ: number = (carGroup as any).__targetZ;
        if (progress < 1) {
          (carGroup as any).__enterProgress = Math.min(1, progress + 0.008);
          const eased = 1 - Math.pow(1 - (carGroup as any).__enterProgress, 3);
          carGroup.position.z = (targetZ - 8) + 8 * eased;
        }
      });

      // Pulse available lights
      const t = Date.now() * 0.001;
      scene.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.userData?.slotId) {
          // already handled
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, animationId: 0, slotMeshes, carMeshes };

    const handleResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("click", handleClick);
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [floorSlots, onSlotClick]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-pointer"
      title="Click on a green slot to book"
    />
  );
}
