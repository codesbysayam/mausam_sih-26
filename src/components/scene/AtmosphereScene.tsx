// ====================================================================
// MAUSAM Interactive 3D India Atmospheric Observatory (Three.js)
// Geographically grounded 3D relief terrain of the Indian Subcontinent
// with composite meteorological beacons, 33 IMD Doppler radar domes &
// terrain-conformed range rings, real-data wind streamlines / static
// vectors, multi-ring official warning perimeters, data-driven cloud
// & precipitation layers, and RSMC cyclone tracks.
// ====================================================================

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { LocationRecord } from '../../types';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { CyclonePayload } from '../../types/cyclone';
import { IMD_DOPPLER_RADAR_NETWORK, RadarStation } from '../../data/radarStations';
import { getColorForStateLayer, getMergedStatePoints } from './geoMath';
import {
  KM_TO_WORLD_X,
  KM_TO_WORLD_Z,
  WORLD_DEPTH,
  WORLD_WIDTH,
  buildIndiaObservatoryTexture,
  buildIndiaTerrainGeometry,
  getTerrainElevation,
  latLngToTerrain,
  terrainToLatLng,
} from './indiaTerrainBuilder';
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

// Elevated oblique observatory framing of the Indian Subcontinent
const DEFAULT_CAMERA_POS = new THREE.Vector3(0.4, 21.8, 21.6);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0.2, 0.25, 0.6);

// Pre-allocated scratch vectors (zero frame-loop GC)
const _tmpVec = new THREE.Vector3();
const _panForward = new THREE.Vector3();
const _panRight = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

function createSoftCloudFieldTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle deterministic tropospheric moisture corridors over Arabian Sea, Ghats, Bay of Bengal, Himalayas
  const wisps = [
    { x: 0.34, y: 0.62, r: 160, a: 0.24 }, // Arabian Sea fetch
    { x: 0.42, y: 0.56, r: 130, a: 0.28 }, // Konkan / Western Ghats
    { x: 0.62, y: 0.54, r: 175, a: 0.30 }, // Bay of Bengal moisture plume
    { x: 0.58, y: 0.38, r: 145, a: 0.24 }, // Gangetic delta & Northeast
    { x: 0.47, y: 0.24, r: 155, a: 0.20 }, // Himalayan ridge veil
    { x: 0.52, y: 0.72, r: 165, a: 0.22 }, // Equatorial Indian Ocean ITCZ
    { x: 0.48, y: 0.46, r: 135, a: 0.18 }, // Central plateau
  ];

  for (const w of wisps) {
    const cx = w.x * canvas.width;
    const cy = w.y * canvas.height;
    const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, w.r);
    grad.addColorStop(0, `rgba(240, 238, 231, ${w.a})`);
    grad.addColorStop(0.55, `rgba(195, 201, 197, ${w.a * 0.42})`);
    grad.addColorStop(1, 'rgba(195, 201, 197, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, w.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createTerrainConformedRingPoints(
  centerLat: number,
  centerLng: number,
  radiusX: number,
  radiusZ: number,
  altitudeOffset: number,
  segments: number
): THREE.Vector3[] {
  const center = latLngToTerrain(centerLat, centerLng, 0, new THREE.Vector3());
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const ang = (i / segments) * Math.PI * 2;
    const x = center.x + Math.cos(ang) * radiusX;
    const z = center.z + Math.sin(ang) * radiusZ;
    const { lat, lng } = terrainToLatLng(x, z);
    const y = getTerrainElevation(lat, lng) + altitudeOffset;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
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
    updatePixelRatio?: () => void;
    flyTo?: (lat: number, lng: number, distance?: number) => void;
  }>({});

  // Imperative WebGL initialization & animation loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Verify WebGL support cleanly & detect software rasterizers
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
      if (q === 'balanced' || q === 'auto') return Math.min(dpr, 1.5);
      return Math.min(dpr, 2.0);
    };

    renderer.setPixelRatio(resolveEffectivePixelRatio());
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute(
      'aria-label',
      'MAUSAM Interactive 3D India Atmospheric Observatory'
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Scene, Horizon Fog, Camera, RoomEnvironment IBL & Physically Plausible Warm Sunlight
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B0C0D');
    scene.fog = new THREE.FogExp2('#0B0C0D', 0.011);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.25, 160);
    camera.position.copy(DEFAULT_CAMERA_POS);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight('#D4DDD8', '#0D0E0F', 0.88);
    scene.add(hemiLight);

    const keySun = new THREE.DirectionalLight('#F7ECD9', 2.15);
    keySun.position.set(18, 28, 16);
    scene.add(keySun);

    const rimLight = new THREE.DirectionalLight('#A7C5C5', 0.55);
    rimLight.position.set(-18, 12, -16);
    scene.add(rimLight);

    // 3. OrbitControls (Left-drag orbit, scroll zoom, right-drag horizontal pan)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.enableDamping = !latestRef.current.reducedMotion;
    controls.dampingFactor = 0.065;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.85;
    controls.panSpeed = 0.72;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2.22;
    controls.minDistance = 6.5;
    controls.maxDistance = 42.0;
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.update();

    // 4. Extended Seamless Obsidian Ocean Horizon & Subtle Observatory Reference Frame
    const oceanGeo = new THREE.PlaneGeometry(180, 180, 1, 1);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: '#0A0D0E',
      roughness: 0.9,
      metalness: 0.08,
      envMapIntensity: 0.35,
    });
    const oceanPlane = new THREE.Mesh(oceanGeo, oceanMat);
    oceanPlane.position.y = -0.025;
    scene.add(oceanPlane);

    // Subtle charcoal reference grid framing the observatory basin
    const basinGrid = new THREE.GridHelper(64, 32, '#2B2F2D', '#181B1A');
    basinGrid.position.y = -0.015;
    const gridMats = Array.isArray(basinGrid.material) ? basinGrid.material : [basinGrid.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.22;
      m.depthWrite = false;
    });
    scene.add(basinGrid);

    // 5. Geographically Grounded 3D India Relief Terrain Mesh
    const initQuality = latestRef.current.qualityTier;
    const terrainSegments =
      initQuality === 'low' || isSoftwareGl ? 64 : initQuality === 'high' ? 160 : 112;
    const textureRes: 1024 | 2048 = initQuality === 'low' || isSoftwareGl ? 1024 : 2048;

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const terrainTexture = buildIndiaObservatoryTexture(textureRes, maxAnisotropy);
    const terrainGeo = buildIndiaTerrainGeometry(terrainSegments);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.82,
      metalness: 0.05,
      envMapIntensity: 0.45,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    scene.add(terrainMesh);

    // Thin brass domain perimeter border around the 3D subcontinent relief plate
    const framePts = [
      new THREE.Vector3(-WORLD_WIDTH * 0.5, 0.01, -WORLD_DEPTH * 0.5),
      new THREE.Vector3(WORLD_WIDTH * 0.5, 0.01, -WORLD_DEPTH * 0.5),
      new THREE.Vector3(WORLD_WIDTH * 0.5, 0.01, WORLD_DEPTH * 0.5),
      new THREE.Vector3(-WORLD_WIDTH * 0.5, 0.01, WORLD_DEPTH * 0.5),
      new THREE.Vector3(-WORLD_WIDTH * 0.5, 0.01, -WORLD_DEPTH * 0.5),
    ];
    const frameGeo = new THREE.BufferGeometry().setFromPoints(framePts);
    const frameMat = new THREE.LineBasicMaterial({
      color: '#C5A46D',
      transparent: true,
      opacity: 0.24,
    });
    const frameLine = new THREE.Line(frameGeo, frameMat);
    scene.add(frameLine);

    // 6. Data-Driven Tropospheric Cloud Veil (Opacity bound strictly to live cloudCover %)
    const cloudTexture = createSoftCloudFieldTexture();
    const cloudGeo = new THREE.PlaneGeometry(WORLD_WIDTH * 0.96, WORLD_DEPTH * 0.96);
    cloudGeo.rotateX(-Math.PI / 2);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
    cloudPlane.position.y = 2.65;
    scene.add(cloudPlane);

    // 7. Terrain-Space Data-Driven Wind Streamlines & Static Vector Arrows
    const windParticles = new WindParticleSystem(640);
    scene.add(windParticles.object);

    // 8. Interactive Spatial Groups
    const pickables: PickableTarget[] = [];
    const stateGroup = new THREE.Group();
    const rainColumnsGroup = new THREE.Group();
    const warningRingsGroup = new THREE.Group();
    const radarGroup = new THREE.Group();
    const selectedGroup = new THREE.Group();
    const cycloneGroup = new THREE.Group();
    scene.add(
      stateGroup,
      rainColumnsGroup,
      warningRingsGroup,
      radarGroup,
      selectedGroup,
      cycloneGroup
    );

    // Shared composite geometries for 36 State Beacons (3-part: plinth + pylon + luminous cap + halo)
    const plinthGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.07, 12);
    const pylonGeo = new THREE.CylinderGeometry(0.032, 0.048, 1.0, 8);
    const beaconCapGeo = new THREE.SphereGeometry(0.105, 14, 12);
    const haloRingGeo = new THREE.RingGeometry(0.18, 0.27, 24);
    haloRingGeo.rotateX(-Math.PI / 2);

    const rainBarGeo = new THREE.CylinderGeometry(0.16, 0.22, 1.0, 10);

    const statePoints = getMergedStatePoints();
    const stateEntries: Array<{
      point: (typeof statePoints)[number];
      basePos: THREE.Vector3;
      plinth: THREE.Mesh;
      plinthMat: THREE.MeshStandardMaterial;
      pylon: THREE.Mesh;
      pylonMat: THREE.MeshStandardMaterial;
      cap: THREE.Mesh;
      capMat: THREE.MeshBasicMaterial;
      halo: THREE.Mesh;
      haloMat: THREE.MeshBasicMaterial;
      rainBar: THREE.Mesh;
      rainBarMat: THREE.MeshStandardMaterial;
    }> = [];

    for (const pt of statePoints) {
      const basePos = latLngToTerrain(pt.lat, pt.lng, 0.015, new THREE.Vector3());

      const plinthMat = new THREE.MeshStandardMaterial({
        color: '#202424',
        roughness: 0.55,
        metalness: 0.35,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.set(basePos.x, basePos.y + 0.035, basePos.z);

      const pylonMat = new THREE.MeshStandardMaterial({
        color: '#C5A46D',
        emissive: '#C5A46D',
        emissiveIntensity: 0.22,
        roughness: 0.35,
        metalness: 0.25,
      });
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);

      const capMat = new THREE.MeshBasicMaterial({ color: '#C5A46D' });
      const cap = new THREE.Mesh(beaconCapGeo, capMat);

      const haloMat = new THREE.MeshBasicMaterial({
        color: '#C5A46D',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloRingGeo, haloMat);
      halo.position.set(basePos.x, basePos.y + 0.025, basePos.z);

      stateGroup.add(plinth, pylon, cap, halo);

      // Data-backed precipitation column (only shown when rainfall > 0 in rain layer; semantic --weather-rain)
      const rainBarMat = new THREE.MeshStandardMaterial({
        color: '#78AEB6',
        emissive: '#3E6A72',
        emissiveIntensity: 0.42,
        transparent: true,
        opacity: 0.78,
        roughness: 0.3,
        metalness: 0.1,
      });
      const rainBar = new THREE.Mesh(rainBarGeo, rainBarMat);
      rainBar.visible = false;
      rainColumnsGroup.add(rainBar);

      stateEntries.push({
        point: pt,
        basePos,
        plinth,
        plinthMat,
        pylon,
        pylonMat,
        cap,
        capMat,
        halo,
        haloMat,
        rainBar,
        rainBarMat,
      });

      const feature: InspectedSpatialFeature = {
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
      };

      pickables.push({ mesh: cap, feature }, { mesh: plinth, feature });

      // Multi-ring official warning perimeter geometry (distinct ring count & polygon shape per severity)
      if (pt.state.warningLevel && pt.state.warningLevel !== 'normal') {
        const level = pt.state.warningLevel;
        const hex =
          level === 'severe' ? '#C94F4B' : level === 'alert' ? '#D98548' : '#D8B14F';
        const ringRadii =
          level === 'severe'
            ? [0.46, 0.68, 0.92]
            : level === 'alert'
            ? [0.48, 0.72]
            : [0.54];
        const polySegs = level === 'severe' ? 8 : 28;

        for (let rIdx = 0; rIdx < ringRadii.length; rIdx++) {
          const rad = ringRadii[rIdx];
          const ringPts = createTerrainConformedRingPoints(
            pt.lat,
            pt.lng,
            rad,
            rad,
            0.055 + rIdx * 0.015,
            polySegs
          );
          const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
          const ringMat = new THREE.LineBasicMaterial({
            color: hex,
            transparent: true,
            opacity: rIdx === 0 ? 0.92 : 0.62,
          });
          warningRingsGroup.add(new THREE.Line(ringGeo, ringMat));
        }
      }
    }

    // 9. 33 Operational IMD Doppler Radar Domes + Terrain-Conformed Range Rings
    const radarPlinthGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.08, 12);
    const radarDomeGeo = new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const radarRings: THREE.Line[] = [];

    for (const dwr of IMD_DOPPLER_RADAR_NETWORK as RadarStation[]) {
      const basePos = latLngToTerrain(dwr.lat, dwr.lng, 0.015, new THREE.Vector3());

      const rPlinthMat = new THREE.MeshStandardMaterial({
        color: '#292E2D',
        roughness: 0.45,
        metalness: 0.4,
      });
      const rPlinth = new THREE.Mesh(radarPlinthGeo, rPlinthMat);
      rPlinth.position.set(basePos.x, basePos.y + 0.04, basePos.z);

      const domeMat = new THREE.MeshStandardMaterial({
        color: '#F0EEE7',
        emissive: '#A7C5C5',
        emissiveIntensity: 0.24,
        roughness: 0.35,
        metalness: 0.12,
      });
      const dome = new THREE.Mesh(radarDomeGeo, domeMat);
      dome.position.set(basePos.x, basePos.y + 0.07, basePos.z);
      radarGroup.add(rPlinth, dome);

      const rangeKm = dwr.rangeKm || 250;
      const rx = rangeKm * KM_TO_WORLD_X;
      const rz = rangeKm * KM_TO_WORLD_Z;
      const circlePts = createTerrainConformedRingPoints(dwr.lat, dwr.lng, rx, rz, 0.045, 36);
      const ringGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
      const ringMat = new THREE.LineBasicMaterial({
        color: '#A7C5C5',
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

    // 10. Composite 4-Part Active Location Observatory Tower (Graphite & Warm Brass)
    const towerBaseGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.08, 20);
    const towerBaseMat = new THREE.MeshStandardMaterial({
      color: '#202424',
      emissive: '#C5A46D',
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.45,
    });
    const towerBase = new THREE.Mesh(towerBaseGeo, towerBaseMat);
    towerBase.position.y = 0.04;

    const towerMastGeo = new THREE.CylinderGeometry(0.032, 0.065, 1.05, 12);
    const towerMastMat = new THREE.MeshStandardMaterial({
      color: '#F0EEE7',
      emissive: '#C5A46D',
      emissiveIntensity: 0.32,
      roughness: 0.25,
      metalness: 0.38,
    });
    const towerMast = new THREE.Mesh(towerMastGeo, towerMastMat);
    towerMast.position.y = 0.56;

    const towerOrbGeo = new THREE.SphereGeometry(0.145, 18, 14);
    const towerOrbMat = new THREE.MeshBasicMaterial({ color: '#F0EEE7' });
    const towerOrb = new THREE.Mesh(towerOrbGeo, towerOrbMat);
    towerOrb.position.y = 1.12;

    const towerRingGeo = new THREE.RingGeometry(0.36, 0.48, 36);
    towerRingGeo.rotateX(-Math.PI / 2);
    const towerRingMat = new THREE.MeshBasicMaterial({
      color: '#C5A46D',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const towerRing = new THREE.Mesh(towerRingGeo, towerRingMat);
    towerRing.position.y = 0.05;

    const towerPulseGeo = new THREE.RingGeometry(0.52, 0.62, 36);
    towerPulseGeo.rotateX(-Math.PI / 2);
    const towerPulseMat = new THREE.MeshBasicMaterial({
      color: '#E0C18A',
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const towerPulse = new THREE.Mesh(towerPulseGeo, towerPulseMat);
    towerPulse.position.y = 0.04;

    selectedGroup.add(towerBase, towerMast, towerOrb, towerRing, towerPulse);

    const updateSelectedLocationMarker = () => {
      const loc = latestRef.current.selectedLocation;
      latLngToTerrain(loc.lat, loc.lng, 0.02, _tmpVec);
      selectedGroup.position.copy(_tmpVec);
    };

    // 11. Official RSMC Cyclone Tracks / Calm Basin Watch Arcs
    const updateCycloneGroup = () => {
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
        // Calm Bay of Bengal & Arabian Sea synoptic watch perimeters (zero fabricated storms)
        const basins = [
          { lat: 14.8, lng: 87.5 },
          { lat: 14.8, lng: 66.5 },
        ];
        for (const b of basins) {
          const pts = createTerrainConformedRingPoints(b.lat, b.lng, 2.2, 2.0, 0.06, 44);
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({
            color: '#A7C5C5',
            transparent: true,
            opacity: 0.24,
          });
          cycloneGroup.add(new THREE.Line(geo, mat));
        }
        return;
      }

      for (const sys of systems) {
        if (!Number.isFinite(sys.latitude) || !Number.isFinite(sys.longitude)) continue;
        const eyePtsInner = createTerrainConformedRingPoints(
          sys.latitude,
          sys.longitude,
          0.45,
          0.45,
          0.18,
          32
        );
        const eyePtsOuter = createTerrainConformedRingPoints(
          sys.latitude,
          sys.longitude,
          0.85,
          0.85,
          0.14,
          32
        );
        cycloneGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(eyePtsInner),
            new THREE.LineBasicMaterial({ color: '#C94F4B', transparent: true, opacity: 0.95 })
          ),
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(eyePtsOuter),
            new THREE.LineBasicMaterial({ color: '#D98548', transparent: true, opacity: 0.72 })
          )
        );

        if (sys.forecastTrack && sys.forecastTrack.length > 0) {
          const trackPts = [
            latLngToTerrain(sys.latitude, sys.longitude, 0.22),
            ...sys.forecastTrack
              .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
              .map((p) => latLngToTerrain(p.latitude, p.longitude, 0.22)),
          ];
          if (trackPts.length > 1) {
            const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPts);
            const trackMat = new THREE.LineBasicMaterial({
              color: '#D98548',
              transparent: true,
              opacity: 0.88,
            });
            cycloneGroup.add(new THREE.Line(trackGeo, trackMat));
          }
        }
      }
    };

    // 12. Synchronize Active Layer Visuals with Real Weather Data
    const updateLayerVisuals = () => {
      const {
        activeLayer: layer,
        weatherBundle: bundle,
        selectedLocation: loc,
        timelineIndex: tIdx,
        reducedMotion: rm,
        qualityTier: q,
      } = latestRef.current;

      const hourlyItem = bundle.hourly?.[tIdx];
      const windSpeed = hourlyItem?.windSpeed ?? bundle.current.windSpeed ?? null;
      const windDir =
        hourlyItem?.windDirection ?? bundle.current.windDirectionDeg ?? bundle.current.windDirection;

      if (typeof windSpeed === 'number' && Number.isFinite(windSpeed)) {
        windParticles.updateLiveWindFocus(loc.lat, loc.lng, windSpeed, windDir);
      }

      const useStaticVectors = rm || q === 'low' || isSoftwareGl;
      if (layer === 'wind') {
        windParticles.setIntensityVisibility('primary', 1.0, useStaticVectors);
      } else if (layer === 'conditions' || layer === 'rain' || layer === 'cyclones') {
        windParticles.setIntensityVisibility('subtle', 0.82, useStaticVectors);
      } else {
        windParticles.setIntensityVisibility('subtle', 0.35, useStaticVectors);
      }

      // Data-driven cloud cover opacity (0% or missing = transparent)
      const rawCloudPct = hourlyItem?.cloudCover ?? bundle.current.cloudCover;
      if (typeof rawCloudPct === 'number' && Number.isFinite(rawCloudPct) && rawCloudPct > 0) {
        const frac = THREE.MathUtils.clamp(rawCloudPct / 100, 0, 1);
        cloudMat.opacity =
          layer === 'satellite'
            ? THREE.MathUtils.clamp(0.18 + frac * 0.72, 0.15, 0.9)
            : layer === 'rain' || layer === 'cyclones'
            ? frac * 0.42
            : frac * 0.22;
        cloudPlane.visible = cloudMat.opacity > 0.02;
      } else {
        cloudMat.opacity = 0;
        cloudPlane.visible = false;
      }

      // Radar network domes & terrain-conformed range rings
      radarGroup.visible = layer === 'radar' || layer === 'rain';
      for (const rLine of radarRings) {
        (rLine.material as THREE.LineBasicMaterial).opacity = layer === 'radar' ? 0.56 : 0.16;
      }

      // Official warning perimeters prominent in warnings layer
      warningRingsGroup.visible = layer === 'warnings' || layer === 'cyclones';

      // Precipitation columns visible ONLY when rain layer active & rainfall > 0
      rainColumnsGroup.visible = layer === 'rain';

      // Update 36 composite state beacons
      for (const entry of stateEntries) {
        const s = entry.point.state;
        const hex = getColorForStateLayer(s, layer);
        entry.capMat.color.set(hex);
        entry.haloMat.color.set(hex);
        entry.pylonMat.color.set(hex);
        entry.pylonMat.emissive.set(hex);

        let valRatio = 0.22;
        if (layer === 'conditions') {
          valRatio = THREE.MathUtils.clamp((s.temperature - 10) / 34, 0.12, 1.0);
        } else if (layer === 'rain') {
          valRatio = THREE.MathUtils.clamp(s.rainfall / 38, 0.05, 1.0);
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
              : 0.1;
        } else if (layer === 'agromet') {
          valRatio = THREE.MathUtils.clamp(s.humidity / 100, 0.15, 1.0);
        }

        const pylonHeight = layer === 'radar' ? 0.16 : 0.22 + valRatio * 1.15;
        entry.pylon.scale.set(1, pylonHeight, 1);
        entry.pylon.position.set(
          entry.basePos.x,
          entry.basePos.y + 0.07 + pylonHeight * 0.5,
          entry.basePos.z
        );
        entry.cap.position.set(
          entry.basePos.x,
          entry.basePos.y + 0.07 + pylonHeight,
          entry.basePos.z
        );

        const showStateBeacons = layer !== 'radar';
        entry.plinth.visible = showStateBeacons;
        entry.pylon.visible = showStateBeacons;
        entry.cap.visible = showStateBeacons;
        entry.halo.visible = showStateBeacons;

        // Data-driven precipitation column (strictly hidden when rainfall <= 0)
        if (layer === 'rain' && typeof s.rainfall === 'number' && s.rainfall > 0) {
          const barH = THREE.MathUtils.clamp(0.25 + (s.rainfall / 40) * 2.1, 0.25, 2.4);
          entry.rainBar.scale.set(1, barH, 1);
          entry.rainBar.position.set(
            entry.basePos.x,
            entry.basePos.y + barH * 0.5,
            entry.basePos.z
          );
          entry.rainBar.visible = true;
        } else {
          entry.rainBar.visible = false;
        }
      }

      updateCycloneGroup();
    };

    // 13. Smooth Damped Camera Fly-To (User Orbit Always Takes Precedence)
    let flyCamDest: THREE.Vector3 | null = null;
    let flyTargetDest: THREE.Vector3 | null = null;

    const cancelFlyTo = () => {
      flyCamDest = null;
      flyTargetDest = null;
    };
    controls.addEventListener('start', cancelFlyTo);

    const flyTo = (lat: number, lng: number, distance = 3.25) => {
      // Detect national India overview recenter call
      const isNationalReset =
        Math.abs(lat - 21.5) < 0.45 && Math.abs(lng - 79.0) < 0.45 && distance >= 3.4;

      const nextTarget = new THREE.Vector3();
      const nextCam = new THREE.Vector3();

      if (isNationalReset) {
        nextTarget.copy(DEFAULT_CAMERA_TARGET);
        nextCam.copy(DEFAULT_CAMERA_POS);
      } else {
        latLngToTerrain(lat, lng, 0.15, nextTarget);
        // Map legacy globe distance (~2.8–3.6) cleanly into oblique terrain framing
        const zoomSpan =
          distance <= 5.5
            ? THREE.MathUtils.clamp(9.2 + (distance - 2.8) * 16.5, 9.2, 24.5)
            : THREE.MathUtils.clamp(distance, 8.5, 32.0);
        nextCam.set(
          nextTarget.x + 0.35,
          nextTarget.y + zoomSpan * 0.78,
          nextTarget.z + zoomSpan * 0.82
        );
      }

      if (latestRef.current.reducedMotion) {
        controls.target.copy(nextTarget);
        camera.position.copy(nextCam);
        controls.update();
      } else {
        flyTargetDest = nextTarget;
        flyCamDest = nextCam;
      }
    };

    const updatePixelRatio = () => {
      renderer.setPixelRatio(resolveEffectivePixelRatio());
    };

    sceneHooksRef.current = {
      updateLayerVisuals,
      updateSelectedLocationMarker,
      updateCycloneGroup,
      updatePixelRatio,
      flyTo,
    };

    updateSelectedLocationMarker();
    updateLayerVisuals();

    // 14. Raycasting for Hover Tooltip & Click Station Inspection (Drag vs Click Safe)
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

      const hitMesh = hits[0].object;
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
      if (Math.hypot(dx, dy) > 6) return;
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

    // 15. Accessible Keyboard Spatial Navigation (Arrows/WASD Pan, +/- Zoom, R Recenter)
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      let handled = false;
      const panStep = 1.45;
      camera.getWorldDirection(_panForward);
      _panForward.y = 0;
      if (_panForward.lengthSq() < 0.0001) _panForward.set(0, 0, -1);
      _panForward.normalize();
      _panRight.crossVectors(_panForward, _upAxis).normalize();

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          camera.position.addScaledVector(_panRight, -panStep);
          controls.target.addScaledVector(_panRight, -panStep);
          handled = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          camera.position.addScaledVector(_panRight, panStep);
          controls.target.addScaledVector(_panRight, panStep);
          handled = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          camera.position.addScaledVector(_panForward, panStep);
          controls.target.addScaledVector(_panForward, panStep);
          handled = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          camera.position.addScaledVector(_panForward, -panStep);
          controls.target.addScaledVector(_panForward, -panStep);
          handled = true;
          break;
        case '+':
        case '=': {
          _tmpVec.subVectors(camera.position, controls.target);
          const nextLen = Math.max(controls.minDistance, _tmpVec.length() - 2.2);
          _tmpVec.setLength(nextLen);
          camera.position.copy(controls.target).add(_tmpVec);
          handled = true;
          break;
        }
        case '-':
        case '_': {
          _tmpVec.subVectors(camera.position, controls.target);
          const nextLen = Math.min(controls.maxDistance, _tmpVec.length() + 2.2);
          _tmpVec.setLength(nextLen);
          camera.position.copy(controls.target).add(_tmpVec);
          handled = true;
          break;
        }
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
        if (e.key !== 'r' && e.key !== 'R') {
          cancelFlyTo();
          controls.target.x = THREE.MathUtils.clamp(controls.target.x, -16, 16);
          controls.target.z = THREE.MathUtils.clamp(controls.target.z, -14, 14);
          controls.update();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 16. Responsive Container ResizeObserver
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

    // 17. WebGL Context Loss -> Automatic 2D Map Fallback
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      latestRef.current.onWebGLUnavailable(
        'WebGL rendering context lost. Switched to interactive 2D map.'
      );
    };
    domEl.addEventListener('webglcontextlost', handleContextLost);

    // 18. Main Render Loop with Tab-Visibility Pause & Software-WebGL fenceSync Pacing
    let rafId = 0;
    let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let isPageHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';

    const timer = new THREE.Timer();
    if (typeof document !== 'undefined') {
      timer.connect(document);
    }

    const glCtx = renderer.getContext();
    const isWebGL2 =
      typeof WebGL2RenderingContext !== 'undefined' && glCtx instanceof WebGL2RenderingContext;

    const afterDraw = (onDone: () => void) => {
      if (disposed) return;
      if (isWebGL2) {
        const gl2 = glCtx as WebGL2RenderingContext;
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!sync) {
          cooldownTimer = setTimeout(onDone, 70);
          return;
        }
        gl2.flush();
        const pollFence = () => {
          if (disposed) {
            gl2.deleteSync(sync);
            return;
          }
          const status = gl2.getSyncParameter(sync, gl2.SYNC_STATUS);
          if (status === gl2.SIGNALED) {
            gl2.deleteSync(sync);
            cooldownTimer = setTimeout(onDone, 55);
          } else {
            cooldownTimer = setTimeout(pollFence, 16);
          }
        };
        cooldownTimer = setTimeout(pollFence, 16);
      } else {
        cooldownTimer = setTimeout(onDone, 75);
      }
    };

    const scheduleNextFrame = () => {
      if (disposed || isPageHidden) return;
      const needsYield = isSoftwareGl || latestRef.current.qualityTier === 'low';
      if (needsYield) {
        afterDraw(() => {
          if (!disposed && !isPageHidden) {
            rafId = requestAnimationFrame(animate);
          }
        });
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    const animate = (timestamp?: number) => {
      if (disposed || isPageHidden) return;

      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();
      const { qualityTier: q, reducedMotion: rm } = latestRef.current;

      // Smooth damped camera & target fly-to
      if (flyCamDest && flyTargetDest) {
        const lambda = 4.6;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, flyCamDest.x, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, flyCamDest.y, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, flyCamDest.z, lambda, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, flyTargetDest.x, lambda, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, flyTargetDest.y, lambda, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, flyTargetDest.z, lambda, delta);

        if (
          camera.position.distanceTo(flyCamDest) < 0.06 &&
          controls.target.distanceTo(flyTargetDest) < 0.04
        ) {
          camera.position.copy(flyCamDest);
          controls.target.copy(flyTargetDest);
          flyCamDest = null;
          flyTargetDest = null;
        }
      }

      controls.enableDamping = !rm;
      controls.update();

      // Clamp pan target inside reasonable subcontinent bounds
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -17, 17);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -15, 15);

      const particleRatio =
        q === 'low' || isSoftwareGl ? 0.25 : q === 'balanced' || q === 'auto' ? 0.65 : 1.0;

      windParticles.step(delta, particleRatio, !rm);

      if (!rm) {
        if (cloudPlane.visible) {
          cloudTexture.offset.x = (cloudTexture.offset.x + delta * 0.0032) % 1;
        }
        const pulse = 1 + Math.sin(elapsed * 2.2) * 0.16;
        towerPulse.scale.set(pulse, pulse, 1);
        towerPulseMat.opacity = 0.48 - Math.sin(elapsed * 2.2) * 0.22;
      }

      renderer.render(scene, camera);
      scheduleNextFrame();
    };

    const handleVisibilityChange = () => {
      isPageHidden = document.visibilityState === 'hidden';
      if (isPageHidden) {
        cancelAnimationFrame(rafId);
        if (cooldownTimer) {
          clearTimeout(cooldownTimer);
          cooldownTimer = null;
        }
      } else if (!disposed) {
        timer.update();
        rafId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!isPageHidden) {
      rafId = requestAnimationFrame(animate);
    }

    // 19. Full GPU & Listener Disposal on Unmount
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (cooldownTimer) clearTimeout(cooldownTimer);
      timer.dispose();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      controls.removeEventListener('start', cancelFlyTo);
      controls.dispose();

      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('pointermove', handlePointerMove);
      domEl.removeEventListener('pointerup', handlePointerUp);
      domEl.removeEventListener('webglcontextlost', handleContextLost);

      windParticles.dispose();
      terrainTexture.dispose();
      cloudTexture.dispose();
      envTarget.dispose();

      plinthGeo.dispose();
      pylonGeo.dispose();
      beaconCapGeo.dispose();
      haloRingGeo.dispose();
      rainBarGeo.dispose();
      radarPlinthGeo.dispose();
      radarDomeGeo.dispose();

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

  // Sync dynamic telemetry, quality tier, reduced motion & active layers with live Three.js objects
  useEffect(() => {
    sceneHooksRef.current.updateLayerVisuals?.();
  }, [activeLayer, weatherBundle, timelineIndex, selectedLocation, reducedMotion, qualityTier]);

  useEffect(() => {
    sceneHooksRef.current.updatePixelRatio?.();
  }, [qualityTier]);

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
          className="pointer-events-none absolute z-20 spatial-hud-surface-elevated rounded-lg px-3 py-2 text-xs text-[var(--m-text-primary)] max-w-[235px]"
          style={{
            left: Math.min(hoverPreview.x + 14, (mountRef.current?.clientWidth || 800) - 245),
            top: Math.max(64, hoverPreview.y - 48),
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[var(--m-text-primary)] truncate">
              {hoverPreview.title}
            </span>
            {hoverPreview.badge && (
              <span className="text-[10px] font-mono text-[var(--m-accent)] shrink-0">
                {hoverPreview.badge}
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--m-text-secondary)] tabular-nums mt-0.5">
            {hoverPreview.subtitle}
          </div>
        </div>
      )}
    </div>
  );
};
