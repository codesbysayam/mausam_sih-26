// ====================================================================
// MAUSAM Interactive 3D Atmospheric Environment (Three.js + OrbitControls)
// Mounted cleanly inside a single ref container without React-Three-Fiber
// to ensure deterministic WebGL lifecycle, SwiftShader safety, and 60fps GPU rendering.
// ====================================================================

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { CyclonePayload } from '../../types/cyclone';
import { IMD_DOPPLER_RADAR_NETWORK, RadarStation } from '../../data/radarStations';
import {
  GLOBE_RADIUS,
  buildProceduralEarthTextures,
  getColorForStateLayer,
  getMergedStatePoints,
  latLngToVector3,
} from './geoMath';
import { WindParticleSystem } from './WindParticleSystem';
import {
  InspectedSpatialFeature,
  QualityTier,
  SpatialLayerId,
} from '../../context/ExperienceContext';

interface HoverPreview {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  badge?: string;
}

interface AtmosphereSceneProps {
  selectedLocation: LocationRecord;
  weatherBundle: WeatherDataBundle;
  cyclonePayload?: CyclonePayload | null;
  activeLayer: SpatialLayerId;
  timelineIndex: number;
  qualityTier: QualityTier;
  reducedMotion: boolean;
  cameraFlyTarget: { lat: number; lng: number; distance?: number; nonce: number } | null;
  onSelectFeature: (feature: InspectedSpatialFeature) => void;
  onRecenterIndia: () => void;
  onWebGLUnavailable: (reason: string) => void;
}

interface PickableTarget {
  mesh: THREE.Object3D;
  feature: InspectedSpatialFeature;
}

const EARTH_RADIUS_KM = 6371;

function createSoftCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle deterministic synoptic cloud filaments concentrated along tropical/monsoon belts
  const patches = [
    { x: 0.72, y: 0.44, r: 65, a: 0.24 }, // Arabian Sea moisture
    { x: 0.74, y: 0.41, r: 48, a: 0.22 }, // Western Ghats
    { x: 0.76, y: 0.39, r: 54, a: 0.26 }, // Bay of Bengal
    { x: 0.77, y: 0.35, r: 46, a: 0.22 }, // Gangetic delta / NE India
    { x: 0.71, y: 0.31, r: 52, a: 0.16 }, // Himalayan ridge
    { x: 0.74, y: 0.46, r: 62, a: 0.20 }, // Equatorial Indian Ocean ITCZ
    { x: 0.68, y: 0.47, r: 58, a: 0.14 },
    { x: 0.81, y: 0.43, r: 60, a: 0.16 },
  ];

  for (const p of patches) {
    const cx = p.x * canvas.width;
    const cy = p.y * canvas.height;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, p.r);
    grad.addColorStop(0, `rgba(226, 239, 252, ${p.a})`);
    grad.addColorStop(0.55, `rgba(184, 214, 240, ${p.a * 0.45})`);
    grad.addColorStop(1, 'rgba(184, 214, 240, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export const AtmosphereScene: React.FC<AtmosphereSceneProps> = ({
  selectedLocation,
  weatherBundle,
  cyclonePayload,
  activeLayer,
  timelineIndex,
  qualityTier,
  reducedMotion,
  cameraFlyTarget,
  onSelectFeature,
  onRecenterIndia,
  onWebGLUnavailable,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);

  // Store dynamic props in refs so the imperative Three.js loop reads latest state cleanly without remounting
  const latestRef = useRef({
    selectedLocation,
    weatherBundle,
    cyclonePayload,
    activeLayer,
    timelineIndex,
    qualityTier,
    reducedMotion,
    onSelectFeature,
    onRecenterIndia,
    onWebGLUnavailable,
  });
  latestRef.current = {
    selectedLocation,
    weatherBundle,
    cyclonePayload,
    activeLayer,
    timelineIndex,
    qualityTier,
    reducedMotion,
    onSelectFeature,
    onRecenterIndia,
    onWebGLUnavailable,
  };

  // Trigger ref for rebuilding/updating layer markers or flying camera without tearing down WebGL context
  const sceneHooksRef = useRef<{
    updateLayerVisuals?: () => void;
    updateSelectedLocationMarker?: () => void;
    updateCycloneGroup?: () => void;
    flyTo?: (lat: number, lng: number, distance?: number) => void;
  }>({});

  // Imperative WebGL initialization & animation loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Verify WebGL support cleanly
    let testCanvas: HTMLCanvasElement | null = document.createElement('canvas');
    const glCheck =
      testCanvas.getContext('webgl2') ||
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl');
    if (!glCheck) {
      latestRef.current.onWebGLUnavailable('WebGL context unavailable on this browser.');
      return;
    }

    let isSoftwareGl = false;
    try {
      const ext = (glCheck as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        const rendererName = String(
          (glCheck as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''
        );
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererName);
      }
    } catch {
      // Ignore extension errors
    }
    testCanvas = null;

    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 720;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch (err: any) {
      latestRef.current.onWebGLUnavailable(err?.message || 'Failed to create WebGL renderer.');
      return;
    }

    const resolveEffectivePixelRatio = () => {
      const q = latestRef.current.qualityTier;
      const dpr = window.devicePixelRatio || 1;
      if (q === 'low' || isSoftwareGl) return Math.min(dpr, 1.0);
      if (q === 'balanced') return Math.min(dpr, 1.5);
      return Math.min(dpr, 2.0);
    };

    renderer.setPixelRatio(resolveEffectivePixelRatio());
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-label', 'MAUSAM Interactive 3D Atmospheric Environment');

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Scene, Camera, Environment & Calibrated Lighting
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111D');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    const initialCamPos = latLngToVector3(21.4, 79.0, 3.45);
    camera.position.copy(initialCamPos);

    // Subtle IBL via RoomEnvironment (mandatory on every GPU/software renderer)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight('#8FC9F5', '#06101B', 0.92);
    scene.add(hemiLight);

    const keySun = new THREE.DirectionalLight('#F4FAFF', 2.15);
    keySun.position.set(4.5, 3.2, 4.0);
    scene.add(keySun);

    const rimLight = new THREE.DirectionalLight('#35C7E8', 0.95);
    rimLight.position.set(-4.2, -1.5, -3.5);
    scene.add(rimLight);

    // 3. OrbitControls (Manual camera navigation without hijacking focus)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !latestRef.current.reducedMotion;
    controls.dampingFactor = 0.065;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 2.08;
    controls.maxDistance = 5.2;
    controls.target.set(0, 0, 0);
    controls.update();

    // 4. Celestial Backdrop Starfield (sparse subtle depth, never noisy)
    const starCount = 320;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 18 + Math.random() * 14;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * Math.PI * 2;
      starPositions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      starPositions[i * 3 + 1] = r * Math.cos(theta);
      starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#7EA5CC',
      size: 0.045,
      transparent: true,
      opacity: 0.42,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 5. Procedural Subcontinent Globe + Fresnel Atmosphere + Cloud Veil
    const { albedoTexture, bumpTexture } = buildProceduralEarthTextures();
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 72, 48);
    const globeMat = new THREE.MeshStandardMaterial({
      map: albedoTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.018,
      roughness: 0.72,
      metalness: 0.14,
      envMapIntensity: 0.7,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    // Subtle cloud veil sphere
    const cloudTexture = createSoftCloudTexture();
    const cloudGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.021, 56, 36);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.55,
      roughness: 0.95,
      metalness: 0.0,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);

    // Atmospheric Fresnel scattering rim shader
    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.068, 56, 36);
    const atmoMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color('#35C7E8') },
        uIntensity: { value: 0.72 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewPos = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 viewDir = normalize(vViewPos);
          float fresnel = pow(0.66 - dot(vNormal, viewDir), 3.4);
          gl_FragColor = vec4(uColor, clamp(fresnel * uIntensity, 0.0, 0.85));
        }
      `,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);

    // Subtle equatorial orbital telemetry ring
    const orbitRingGeo = new THREE.RingGeometry(GLOBE_RADIUS * 1.13, GLOBE_RADIUS * 1.135, 96);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: '#35C7E8',
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2 - 0.18;
    orbitRing.rotation.z = 0.24;
    scene.add(orbitRing);

    // 6. Real-Data Wind Streamline Particle System
    const windParticles = new WindParticleSystem(640);
    scene.add(windParticles.object);

    // 7. Interactive Pickable Meshes: 36 State Beacons + 33 DWR Radar Domes + Selected Location + Cyclones
    const pickables: PickableTarget[] = [];
    const stateGroup = new THREE.Group();
    const radarGroup = new THREE.Group();
    const selectedGroup = new THREE.Group();
    const cycloneGroup = new THREE.Group();
    scene.add(stateGroup, radarGroup, selectedGroup, cycloneGroup);

    // Shared small geometries for efficiency
    const stateNodeGeo = new THREE.SphereGeometry(0.015, 14, 12);
    const stateHaloGeo = new THREE.RingGeometry(0.018, 0.028, 24);
    const stateStemGeo = new THREE.CylinderGeometry(0.0032, 0.0045, 1, 8);
    const radarDomeGeo = new THREE.SphereGeometry(0.013, 12, 10);

    const statePoints = getMergedStatePoints();
    const stateEntries: Array<{
      point: (typeof statePoints)[number];
      node: THREE.Mesh;
      nodeMat: THREE.MeshBasicMaterial;
      halo: THREE.Mesh;
      haloMat: THREE.MeshBasicMaterial;
      stem: THREE.Mesh;
      stemMat: THREE.MeshBasicMaterial;
      normal: THREE.Vector3;
    }> = [];

    for (const pt of statePoints) {
      const surfacePos = latLngToVector3(pt.lat, pt.lng, GLOBE_RADIUS * 1.004);
      const normal = surfacePos.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      const nodeMat = new THREE.MeshBasicMaterial({ color: '#35C7E8' });
      const node = new THREE.Mesh(stateNodeGeo, nodeMat);

      const haloMat = new THREE.MeshBasicMaterial({
        color: '#35C7E8',
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(stateHaloGeo, haloMat);
      halo.position.copy(latLngToVector3(pt.lat, pt.lng, GLOBE_RADIUS * 1.005));
      halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      const stemMat = new THREE.MeshBasicMaterial({
        color: '#35C7E8',
        transparent: true,
        opacity: 0.72,
      });
      const stem = new THREE.Mesh(stateStemGeo, stemMat);
      stem.quaternion.copy(quat);

      stateGroup.add(node, halo, stem);
      stateEntries.push({ point: pt, node, nodeMat, halo, haloMat, stem, stemMat, normal });

      pickables.push({
        mesh: node,
        feature: {
          kind: 'state',
          id: pt.state.id,
          title: pt.state.name,
          subtitle: pt.state.city ? `${pt.state.city} · ${pt.code}` : pt.code,
          lat: pt.lat,
          lng: pt.lng,
          stateName: pt.state.name,
          warningLevel: pt.state.warningLevel,
          warningMessage: pt.state.warningMessage,
          source: pt.state.dataSource,
          metrics: [
            { label: 'Temperature', value: `${pt.state.temperature}°C` },
            { label: 'Wind', value: `${pt.state.windSpeed} km/h ${pt.state.windDir}` },
            { label: 'Rainfall', value: `${pt.state.rainfall} mm` },
            { label: 'Humidity', value: `${pt.state.humidity}%` },
            { label: 'AQI', value: `${pt.state.aqi}` },
          ],
        },
      });
    }

    // Build 33 Operational IMD DWR Stations & Range Circles
    const radarRings: THREE.Line[] = [];
    for (const dwr of IMD_DOPPLER_RADAR_NETWORK as RadarStation[]) {
      const pos = latLngToVector3(dwr.lat, dwr.lng, GLOBE_RADIUS * 1.009);
      const normal = pos.clone().normalize();
      const domeMat = new THREE.MeshBasicMaterial({ color: '#35C7E8' });
      const dome = new THREE.Mesh(radarDomeGeo, domeMat);
      dome.position.copy(pos);
      radarGroup.add(dome);

      // Compute exact spherical radius on globe corresponding to dwr.rangeKm
      const angularRadius = (dwr.rangeKm || 250) / EARTH_RADIUS_KM;
      const circlePts: THREE.Vector3[] = [];
      const segments = 32;
      const tangentA = new THREE.Vector3(1, 0, 0);
      if (Math.abs(normal.dot(tangentA)) > 0.9) tangentA.set(0, 0, 1);
      tangentA.crossVectors(normal, tangentA).normalize();
      const tangentB = new THREE.Vector3().crossVectors(normal, tangentA).normalize();

      for (let s = 0; s <= segments; s++) {
        const ang = (s / segments) * Math.PI * 2;
        const dir = new THREE.Vector3()
          .copy(normal)
          .multiplyScalar(Math.cos(angularRadius))
          .addScaledVector(tangentA, Math.sin(angularRadius) * Math.cos(ang))
          .addScaledVector(tangentB, Math.sin(angularRadius) * Math.sin(ang))
          .normalize()
          .multiplyScalar(GLOBE_RADIUS * 1.007);
        circlePts.push(dir);
      }

      const ringGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
      const ringMat = new THREE.LineBasicMaterial({
        color: '#35C7E8',
        transparent: true,
        opacity: 0.42,
      });
      const ringLine = new THREE.Line(ringGeo, ringMat);
      radarGroup.add(ringLine);
      radarRings.push(ringLine);

      pickables.push({
        mesh: dome,
        feature: {
          kind: 'radar',
          id: dwr.id,
          title: `${dwr.city} DWR`,
          subtitle: `${dwr.state} · ${dwr.band}`,
          lat: dwr.lat,
          lng: dwr.lng,
          stateName: dwr.state,
          source: `IMD ${dwr.model}`,
          metrics: [
            { label: 'Band', value: dwr.band.split(' ')[0] },
            { label: 'Range', value: `${dwr.rangeKm} km` },
            { label: 'Code', value: (dwr.imdCode || dwr.id).toUpperCase() },
            { label: 'Status', value: 'Operational' },
          ],
        },
      });
    }

    // Active Selected Location Orbital Beacon
    const beaconPinMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const beaconPin = new THREE.Mesh(new THREE.SphereGeometry(0.022, 18, 14), beaconPinMat);
    const beaconRingMat = new THREE.MeshBasicMaterial({
      color: '#35C7E8',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.036, 0.052, 32), beaconRingMat);
    const beaconPulseRingMat = new THREE.MeshBasicMaterial({
      color: '#35C7E8',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beaconPulseRing = new THREE.Mesh(new THREE.RingGeometry(0.056, 0.068, 32), beaconPulseRingMat);
    selectedGroup.add(beaconPin, beaconRing, beaconPulseRing);

    const updateSelectedLocationMarker = () => {
      const loc = latestRef.current.selectedLocation;
      const pos = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS * 1.016);
      const surfPos = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS * 1.008);
      const normal = surfPos.clone().normalize();
      beaconPin.position.copy(pos);
      beaconRing.position.copy(surfPos);
      beaconRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      beaconPulseRing.position.copy(surfPos);
      beaconPulseRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    };

    const updateCycloneGroup = () => {
      // Clear previous meshes cleanly
      while (cycloneGroup.children.length > 0) {
        const child = cycloneGroup.children[0] as THREE.Mesh | THREE.Line;
        cycloneGroup.remove(child);
        if ((child as any).geometry) (child as any).geometry.dispose();
        if ((child as any).material) (child as any).material.dispose();
      }

      const layer = latestRef.current.activeLayer;
      const systems = latestRef.current.cyclonePayload?.systems || [];
      cycloneGroup.visible = layer === 'cyclones' || systems.length > 0;
      if (!cycloneGroup.visible) return;

      if (systems.length === 0) {
        // Draw calm Bay of Bengal & Arabian Sea synoptic monitoring arcs when basin is clear
        const basins = [
          { lat: 14.5, lng: 86.5 },
          { lat: 14.5, lng: 67.5 },
        ];
        for (const b of basins) {
          const pos = latLngToVector3(b.lat, b.lng, GLOBE_RADIUS * 1.009);
          const normal = pos.clone().normalize();
          const bRing = new THREE.Mesh(
            new THREE.RingGeometry(0.11, 0.118, 36),
            new THREE.MeshBasicMaterial({
              color: '#35C7E8',
              transparent: true,
              opacity: 0.32,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          bRing.position.copy(pos);
          bRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
          cycloneGroup.add(bRing);
        }
        return;
      }

      for (const sys of systems) {
        if (!Number.isFinite(sys.latitude) || !Number.isFinite(sys.longitude)) continue;
        const eyePos = latLngToVector3(sys.latitude, sys.longitude, GLOBE_RADIUS * 1.018);
        const normal = eyePos.clone().normalize();
        const eyeMesh = new THREE.Mesh(
          new THREE.RingGeometry(0.028, 0.056, 32),
          new THREE.MeshBasicMaterial({
            color: '#E0525B',
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        eyeMesh.position.copy(eyePos);
        eyeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        cycloneGroup.add(eyeMesh);

        if (sys.forecastTrack && sys.forecastTrack.length > 0) {
          const pts = [
            eyePos,
            ...sys.forecastTrack
              .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
              .map((p) => latLngToVector3(p.latitude, p.longitude, GLOBE_RADIUS * 1.014)),
          ];
          if (pts.length > 1) {
            const trackGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const trackMat = new THREE.LineBasicMaterial({ color: '#F28B45', transparent: true, opacity: 0.85 });
            cycloneGroup.add(new THREE.Line(trackGeo, trackMat));
          }
        }
      }
    };

    const updateLayerVisuals = () => {
      const { activeLayer: layer, weatherBundle: bundle, selectedLocation: loc, timelineIndex: tIdx } =
        latestRef.current;

      // Update wind flow system with active hour forecast or current wind
      const hourlyItem = bundle.hourly?.[tIdx];
      const windSpeed = hourlyItem?.windSpeed ?? bundle.current.windSpeed ?? 0;
      const windDir = hourlyItem?.windDirection ?? bundle.current.windDirectionDeg ?? bundle.current.windDirection;
      windParticles.updateLiveWindFocus(loc.lat, loc.lng, windSpeed, windDir);

      if (layer === 'wind') {
        windParticles.setIntensityVisibility('primary', 1.0);
      } else if (layer === 'conditions' || layer === 'rain' || layer === 'cyclones') {
        windParticles.setIntensityVisibility('subtle', 0.95);
      } else {
        windParticles.setIntensityVisibility('subtle', 0.45);
      }

      // Cloud veil opacity mirrors real cloud cover + layer focus
      const cloudPct = hourlyItem?.cloudCover ?? bundle.current.cloudCover ?? 40;
      cloudMat.opacity =
        layer === 'satellite'
          ? THREE.MathUtils.clamp(0.35 + (cloudPct / 100) * 0.6, 0.35, 0.95)
          : layer === 'rain' || layer === 'cyclones'
          ? 0.48
          : 0.24;

      // Radar domes & rings prominent in radar layer, quiet in others
      radarGroup.visible = layer === 'radar' || layer === 'rain';
      for (const rLine of radarRings) {
        (rLine.material as THREE.LineBasicMaterial).opacity = layer === 'radar' ? 0.56 : 0.14;
      }

      // Update 36 state beacons colors and elevation stems per active layer
      for (const entry of stateEntries) {
        const s = entry.point.state;
        const hex = getColorForStateLayer(s, layer);
        entry.nodeMat.color.set(hex);
        entry.haloMat.color.set(hex);
        entry.stemMat.color.set(hex);

        let valRatio = 0.22;
        if (layer === 'conditions') {
          valRatio = THREE.MathUtils.clamp((s.temperature - 10) / 34, 0.12, 1.0);
        } else if (layer === 'rain') {
          valRatio = THREE.MathUtils.clamp(s.rainfall / 38, 0.08, 1.0);
        } else if (layer === 'aqi') {
          valRatio = THREE.MathUtils.clamp(s.aqi / 180, 0.12, 1.0);
        } else if (layer === 'wind') {
          valRatio = THREE.MathUtils.clamp(s.windSpeed / 30, 0.12, 1.0);
        } else if (layer === 'warnings') {
          valRatio =
            s.warningLevel === 'severe'
              ? 1.0
              : s.warningLevel === 'alert'
              ? 0.72
              : s.warningLevel === 'watch'
              ? 0.45
              : 0.12;
        } else if (layer === 'agromet') {
          valRatio = THREE.MathUtils.clamp(s.humidity / 100, 0.15, 1.0);
        }

        const stemHeight = layer === 'radar' ? 0.01 : 0.014 + valRatio * 0.068;
        entry.stem.scale.set(1, stemHeight, 1);
        const surfPos = latLngToVector3(entry.point.lat, entry.point.lng, GLOBE_RADIUS * 1.003);
        entry.stem.position.copy(surfPos).addScaledVector(entry.normal, stemHeight * 0.5);
        entry.node.position.copy(surfPos).addScaledVector(entry.normal, stemHeight);

        const highlightMarker = layer !== 'radar';
        entry.node.visible = highlightMarker;
        entry.stem.visible = highlightMarker;
        entry.halo.visible = highlightMarker;
      }

      updateCycloneGroup();
    };

    // Smooth camera fly-to target state
    let flyDestination: THREE.Vector3 | null = null;
    const cancelFlyTo = () => {
      flyDestination = null;
    };
    controls.addEventListener('start', cancelFlyTo);

    const flyTo = (lat: number, lng: number, distance = 3.25) => {
      const dest = latLngToVector3(lat, lng, distance);
      if (latestRef.current.reducedMotion) {
        camera.position.copy(dest);
        controls.update();
      } else {
        flyDestination = dest;
      }
    };

    sceneHooksRef.current = {
      updateLayerVisuals,
      updateSelectedLocationMarker,
      updateCycloneGroup,
      flyTo,
    };

    updateSelectedLocationMarker();
    updateLayerVisuals();

    // 8. Raycasting for Hover Preview & Click Inspection (Distinguish Drag vs Click)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const getPickHit = (clientX: number, clientY: number): PickableTarget | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const candidateMeshes = pickables
        .filter((p) => p.mesh.visible && (p.mesh.parent?.visible ?? true))
        .map((p) => p.mesh);

      const hits = raycaster.intersectObjects(candidateMeshes, false);
      if (hits.length === 0) return null;

      // Ensure hit is on the front-facing hemisphere
      const hitMesh = hits[0].object;
      const hitWorld = new THREE.Vector3();
      hitMesh.getWorldPosition(hitWorld);
      if (hitWorld.dot(camera.position) < 0) return null;

      return pickables.find((p) => p.mesh === hitMesh) || null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.buttons > 0) {
        setHoverPreview(null);
        return;
      }
      const match = getPickHit(e.clientX, e.clientY);
      if (match) {
        renderer.domElement.style.cursor = 'pointer';
        const rect = container.getBoundingClientRect();
        const metricLine = match.feature.metrics
          .slice(0, 2)
          .map((m) => `${m.label}: ${m.value}`)
          .join(' · ');
        setHoverPreview({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          title: match.feature.title,
          subtitle: metricLine || match.feature.subtitle,
          badge: match.feature.kind === 'radar' ? 'IMD DWR' : undefined,
        });
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoverPreview(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return; // Ignore orbit drag
      const match = getPickHit(e.clientX, e.clientY);
      if (match) {
        latestRef.current.onSelectFeature(match.feature);
        flyTo(match.feature.lat, match.feature.lng, 2.95);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', handlePointerDown);
    domEl.addEventListener('pointermove', handlePointerMove);
    domEl.addEventListener('pointerup', handlePointerUp);

    // 9. Accessible Keyboard Spatial Navigation (WASD / Arrows / + / - / R)
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const spherical = new THREE.Spherical().setFromVector3(camera.position);
      let handled = false;
      const rotStep = 0.08;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          spherical.theta -= rotStep;
          handled = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          spherical.theta += rotStep;
          handled = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          spherical.phi = Math.max(0.35, spherical.phi - rotStep);
          handled = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          spherical.phi = Math.min(Math.PI - 0.35, spherical.phi + rotStep);
          handled = true;
          break;
        case '+':
        case '=':
          spherical.radius = Math.max(controls.minDistance, spherical.radius - 0.25);
          handled = true;
          break;
        case '-':
        case '_':
          spherical.radius = Math.min(controls.maxDistance, spherical.radius + 0.25);
          handled = true;
          break;
        case 'r':
        case 'R':
          latestRef.current.onRecenterIndia();
          handled = true;
          break;
        default:
          break;
      }

      if (handled) {
        e.preventDefault();
        cancelFlyTo();
        camera.position.setFromSpherical(spherical);
        controls.update();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 10. Responsive Container ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w < 10 || h < 10) return;
      renderer.setPixelRatio(resolveEffectivePixelRatio());
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 11. WebGL Context Loss -> Automatic 2D Map Fallback
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      latestRef.current.onWebGLUnavailable('WebGL rendering context lost. Switched to interactive 2D map.');
    };
    domEl.addEventListener('webglcontextlost', handleContextLost);

    // 12. Main Render Loop with Software-WebGL CPU Yielding
    let rafId = 0;
    let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const { qualityTier: q, reducedMotion: rm } = latestRef.current;

      // Smooth damped camera fly-to
      if (flyDestination) {
        const lambda = 4.6;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, flyDestination.x, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, flyDestination.y, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, flyDestination.z, lambda, delta);
        if (camera.position.distanceTo(flyDestination) < 0.015) {
          camera.position.copy(flyDestination);
          flyDestination = null;
        }
      }

      controls.enableDamping = !rm;
      controls.update();

      // Particle budget scaled cleanly by quality tier
      const particleRatio =
        q === 'low' || isSoftwareGl ? 0.25 : q === 'balanced' ? 0.65 : 1.0;

      windParticles.step(delta, particleRatio, !rm);

      if (!rm) {
        cloudMesh.rotation.y += delta * 0.008;
        const pulse = 1 + Math.sin(elapsed * 2.2) * 0.18;
        beaconPulseRing.scale.set(pulse, pulse, 1);
        beaconPulseRingMat.opacity = 0.52 - Math.sin(elapsed * 2.2) * 0.25;
      }

      renderer.render(scene, camera);

      const needsYield = isSoftwareGl || q === 'low';
      if (needsYield) {
        cooldownTimer = setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(animate);
        }, 70);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);

    // 13. Full Disposal on Unmount
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (cooldownTimer) clearTimeout(cooldownTimer);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      controls.removeEventListener('start', cancelFlyTo);
      controls.dispose();

      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('pointermove', handlePointerMove);
      domEl.removeEventListener('pointerup', handlePointerUp);
      domEl.removeEventListener('webglcontextlost', handleContextLost);

      windParticles.dispose();
      albedoTexture.dispose();
      bumpTexture.dispose();
      cloudTexture.dispose();
      globeGeo.dispose();
      globeMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      orbitRingGeo.dispose();
      orbitRingMat.dispose();
      starGeo.dispose();
      starMat.dispose();

      stateNodeGeo.dispose();
      stateHaloGeo.dispose();
      stateStemGeo.dispose();
      radarDomeGeo.dispose();
      stateEntries.forEach((e) => {
        e.nodeMat.dispose();
        e.haloMat.dispose();
        e.stemMat.dispose();
      });

      beaconPin.geometry.dispose();
      beaconPinMat.dispose();
      beaconRing.geometry.dispose();
      beaconRingMat.dispose();
      beaconPulseRing.geometry.dispose();
      beaconPulseRingMat.dispose();

      scene.traverse((obj) => {
        if ((obj as any).geometry) (obj as any).geometry.dispose?.();
        if ((obj as any).material) {
          const mat = (obj as any).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
          else mat.dispose?.();
        }
      });

      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Sync dynamic telemetry & active layers with live Three.js objects
  useEffect(() => {
    sceneHooksRef.current.updateLayerVisuals?.();
  }, [activeLayer, weatherBundle, timelineIndex, selectedLocation]);

  useEffect(() => {
    sceneHooksRef.current.updateSelectedLocationMarker?.();
  }, [selectedLocation]);

  useEffect(() => {
    sceneHooksRef.current.updateCycloneGroup?.();
  }, [cyclonePayload, activeLayer]);

  useEffect(() => {
    if (!cameraFlyTarget) return;
    sceneHooksRef.current.flyTo?.(
      cameraFlyTarget.lat,
      cameraFlyTarget.lng,
      cameraFlyTarget.distance ?? 3.25
    );
  }, [cameraFlyTarget]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Pointer Hover Spatial Readout */}
      {hoverPreview && (
        <div
          className="pointer-events-none absolute z-20 spatial-hud-surface-elevated rounded-lg px-3 py-2 text-xs text-[#F4F7FB] max-w-[230px]"
          style={{
            left: Math.min(hoverPreview.x + 14, (mountRef.current?.clientWidth || 800) - 240),
            top: Math.max(64, hoverPreview.y - 48),
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white truncate">{hoverPreview.title}</span>
            {hoverPreview.badge && (
              <span className="text-[10px] font-mono text-[#35C7E8] shrink-0">{hoverPreview.badge}</span>
            )}
          </div>
          <div className="text-[11px] text-[#B8C7D9] tabular-nums mt-0.5">{hoverPreview.subtitle}</div>
        </div>
      )}
    </div>
  );
};
