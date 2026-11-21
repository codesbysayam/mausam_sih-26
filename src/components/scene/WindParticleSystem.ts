// ====================================================================
// MAUSAM 3D Data-Driven Wind Streamline & Static Vector Field System
// Interpolates 10m wind vectors from regional telemetry + active station,
// gliding smoothly over India's 3D relief terrain.
// Automatically switches to static directional arrows in reduced-motion
// or low-quality mode, and allocates ZERO objects inside the frame loop.
// ====================================================================

import * as THREE from 'three';
import { getMergedStatePoints, windDirToDegrees } from './geoMath';
import { latLngToTerrain } from './indiaTerrainBuilder';

interface ParticleAgent {
  lat: number;
  lng: number;
  age: number;
  maxAge: number;
  speedScale: number;
}

interface WindSourcePoint {
  lat: number;
  lng: number;
  u: number; // eastward km/h
  v: number; // northward km/h
}

const DOMAIN_BOUNDS = {
  latMin: 5.0,
  latMax: 37.5,
  lngMin: 63.0,
  lngMax: 99.0,
};

// Pre-allocated colors & vectors (zero GC per frame)
const _cCalm = new THREE.Color('#9CAF9A');
const _cMod = new THREE.Color('#F0EEE7');
const _cStrong = new THREE.Color('#E6B96B');
const _tmpColor = new THREE.Color();
const _headPos = new THREE.Vector3();
const _tailPos = new THREE.Vector3();
const _wingLeft = new THREE.Vector3();
const _wingRight = new THREE.Vector3();

export class WindParticleSystem {
  public readonly object: THREE.Group;
  private readonly streamLines: THREE.LineSegments;
  private readonly streamGeo: THREE.BufferGeometry;
  private readonly streamMat: THREE.LineBasicMaterial;
  private readonly staticArrowLines: THREE.LineSegments;
  private readonly staticArrowGeo: THREE.BufferGeometry;
  private readonly staticArrowMat: THREE.LineBasicMaterial;

  private readonly count: number;
  private readonly agents: ParticleAgent[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private windSources: WindSourcePoint[] = [];
  private globalMultiplier = 1.0;
  private hasValidWindData = false;

  constructor(maxParticles = 640) {
    this.count = maxParticles;
    this.positions = new Float32Array(this.count * 2 * 3);
    this.colors = new Float32Array(this.count * 2 * 3);

    this.streamGeo = new THREE.BufferGeometry();
    this.streamGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.streamGeo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.streamMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.streamLines = new THREE.LineSegments(this.streamGeo, this.streamMat);
    this.streamLines.frustumCulled = false;

    // Static vector arrow grid for reduced-motion / low-quality mode
    this.staticArrowGeo = new THREE.BufferGeometry();
    this.staticArrowMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    this.staticArrowLines = new THREE.LineSegments(this.staticArrowGeo, this.staticArrowMat);
    this.staticArrowLines.frustumCulled = false;
    this.staticArrowLines.visible = false;

    this.object = new THREE.Group();
    this.object.add(this.streamLines, this.staticArrowLines);

    this.seedInitialWindField();
    this.initAgents();
    this.rebuildStaticArrows();
    this.step(0.035, 1.0, false);
  }

  private seedInitialWindField() {
    const merged = getMergedStatePoints();
    this.windSources = merged.flatMap((pt) => {
      if (
        typeof pt.state.windSpeed !== 'number' ||
        !Number.isFinite(pt.state.windSpeed)
      ) return [];

      const deg = windDirToDegrees(pt.state.windDir);
      if (deg === null) return [];

      const rad = ((deg + 180) * Math.PI) / 180;
      const spd = Math.max(2, pt.state.windSpeed);
      return [{
        lat: pt.lat,
        lng: pt.lng,
        u: Math.sin(rad) * spd,
        v: Math.cos(rad) * spd,
      }];
    });
    this.hasValidWindData = this.windSources.length > 0;
  }

  public updateLiveWindFocus(
    lat: number,
    lng: number,
    speedKmh?: number | null,
    dir?: string | number | null
  ) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (typeof speedKmh !== 'number' || !Number.isFinite(speedKmh)) return;

    const spd = Math.max(1, speedKmh);
    const deg = windDirToDegrees(dir ?? undefined);
    if (deg === null) return;
    const rad = ((deg + 180) * Math.PI) / 180;

    const focusPoint: WindSourcePoint = {
      lat,
      lng,
      u: Math.sin(rad) * spd,
      v: Math.cos(rad) * spd,
    };

    if (this.windSources.length > 36) {
      this.windSources[0] = focusPoint;
    } else {
      this.windSources.unshift(focusPoint);
    }

    this.hasValidWindData = this.windSources.length > 0;
    this.globalMultiplier = THREE.MathUtils.clamp(0.75 + spd / 40, 0.72, 1.8);
    this.rebuildStaticArrows();
  }

  private initAgents() {
    for (let i = 0; i < this.count; i++) {
      this.agents.push(this.spawnAgent(true));
    }
  }

  private spawnAgent(randomAge = false): ParticleAgent {
    const lat = DOMAIN_BOUNDS.latMin + Math.random() * (DOMAIN_BOUNDS.latMax - DOMAIN_BOUNDS.latMin);
    const lng = DOMAIN_BOUNDS.lngMin + Math.random() * (DOMAIN_BOUNDS.lngMax - DOMAIN_BOUNDS.lngMin);
    const maxAge = 48 + Math.floor(Math.random() * 56);
    return {
      lat,
      lng,
      age: randomAge ? Math.floor(Math.random() * maxAge) : 0,
      maxAge,
      speedScale: 0.8 + Math.random() * 0.42,
    };
  }

  private sampleWindVector(lat: number, lng: number): { u: number; v: number; mag: number } {
    let sumW = 0;
    let sumU = 0;
    let sumV = 0;

    for (let i = 0; i < this.windSources.length; i++) {
      const s = this.windSources[i];
      const dLat = lat - s.lat;
      const dLng = lng - s.lng;
      const distSq = dLat * dLat + dLng * dLng + 6.0;
      const w = 1 / distSq;
      sumW += w;
      sumU += s.u * w;
      sumV += s.v * w;
    }

    if (sumW <= 0) return { u: 0, v: 0, mag: 0 };
    const u = sumU / sumW;
    const v = sumV / sumW;
    return { u, v, mag: Math.sqrt(u * u + v * v) };
  }

  /**
   * Builds a clean grid of static directional wind arrows over India & seas
   * for reduced-motion / low-quality tiers (3 segments per arrow: shaft + 2 barbs).
   */
  private rebuildStaticArrows() {
    if (!this.hasValidWindData) return;

    const lats: number[] = [];
    const lngs: number[] = [];
    for (let lat = 7; lat <= 35; lat += 3.2) lats.push(lat);
    for (let lng = 66; lng <= 96; lng += 3.2) lngs.push(lng);

    const arrowCount = lats.length * lngs.length;
    const posArr = new Float32Array(arrowCount * 6 * 3); // 3 line segments = 6 vertices
    const colArr = new Float32Array(arrowCount * 6 * 3);

    let ptr = 0;
    for (const lat of lats) {
      for (const lng of lngs) {
        const { u, v, mag } = this.sampleWindVector(lat, lng);
        if (mag < 0.2) continue;

        const normU = u / mag;
        const normV = v / mag;
        const lenDeg = THREE.MathUtils.clamp(0.55 + mag * 0.042, 0.65, 1.75);
        const headLat = lat + normV * lenDeg * 0.5;
        const headLng = lng + normU * lenDeg * 0.5;
        const tailLat = lat - normV * lenDeg * 0.5;
        const tailLng = lng - normU * lenDeg * 0.5;

        const barbLen = lenDeg * 0.34;
        const angle = Math.atan2(normV, normU);
        const leftLat = headLat - Math.sin(angle - 0.52) * barbLen;
        const leftLng = headLng - Math.cos(angle - 0.52) * barbLen;
        const rightLat = headLat - Math.sin(angle + 0.52) * barbLen;
        const rightLng = headLng - Math.cos(angle + 0.52) * barbLen;

        latLngToTerrain(headLat, headLng, 0.34, _headPos);
        latLngToTerrain(tailLat, tailLng, 0.34, _tailPos);
        latLngToTerrain(leftLat, leftLng, 0.34, _wingLeft);
        latLngToTerrain(rightLat, rightLng, 0.34, _wingRight);

        if (mag > 22) {
          _tmpColor.copy(_cMod).lerp(_cStrong, Math.min(1, (mag - 22) / 20));
        } else {
          _tmpColor.copy(_cCalm).lerp(_cMod, Math.min(1, mag / 22));
        }

        const segs: [THREE.Vector3, THREE.Vector3][] = [
          [_tailPos, _headPos],
          [_headPos, _wingLeft],
          [_headPos, _wingRight],
        ];
        for (const [a, b] of segs) {
          posArr[ptr] = a.x;
          posArr[ptr + 1] = a.y;
          posArr[ptr + 2] = a.z;
          colArr[ptr] = _tmpColor.r;
          colArr[ptr + 1] = _tmpColor.g;
          colArr[ptr + 2] = _tmpColor.b;
          ptr += 3;

          posArr[ptr] = b.x;
          posArr[ptr + 1] = b.y;
          posArr[ptr + 2] = b.z;
          colArr[ptr] = _tmpColor.r;
          colArr[ptr + 1] = _tmpColor.g;
          colArr[ptr + 2] = _tmpColor.b;
          ptr += 3;
        }
      }
    }

    this.staticArrowGeo.setAttribute('position', new THREE.BufferAttribute(posArr.subarray(0, ptr), 3));
    this.staticArrowGeo.setAttribute('color', new THREE.BufferAttribute(colArr.subarray(0, ptr), 3));
    this.staticArrowGeo.attributes.position.needsUpdate = true;
    this.staticArrowGeo.attributes.color.needsUpdate = true;
  }

  public setIntensityVisibility(
    emphasis: 'primary' | 'subtle' | 'hidden',
    opacityScale = 1,
    useStaticVectors = false
  ) {
    if (emphasis === 'hidden' || !this.hasValidWindData) {
      this.object.visible = false;
      return;
    }
    this.object.visible = true;
    this.streamLines.visible = !useStaticVectors;
    this.staticArrowLines.visible = useStaticVectors;

    const baseOpacity = emphasis === 'primary' ? 0.9 : 0.34;
    this.streamMat.opacity = baseOpacity * opacityScale;
    this.staticArrowMat.opacity = (emphasis === 'primary' ? 0.85 : 0.36) * opacityScale;
  }

  public step(deltaSec: number, activeCountRatio = 1.0, animate = true) {
    if (!this.hasValidWindData || !this.streamLines.visible) return;

    const dt = Math.min(deltaSec, 0.05);
    const activeCount = Math.min(this.count, Math.max(48, Math.floor(this.count * activeCountRatio)));
    const pArr = this.positions;
    const cArr = this.colors;

    for (let i = 0; i < this.count; i++) {
      const baseIdx = i * 6;
      if (i >= activeCount) {
        pArr[baseIdx] = 0;
        pArr[baseIdx + 1] = -50;
        pArr[baseIdx + 2] = 0;
        pArr[baseIdx + 3] = 0;
        pArr[baseIdx + 4] = -50;
        pArr[baseIdx + 5] = 0;
        continue;
      }

      const agent = this.agents[i];
      const { u, v, mag } = this.sampleWindVector(agent.lat, agent.lng);
      const normU = mag > 0.001 ? u / mag : 1;
      const normV = mag > 0.001 ? v / mag : 0;

      const tailLenDeg = THREE.MathUtils.clamp(0.055 * Math.max(6, mag) * this.globalMultiplier, 0.38, 1.9);
      const tailLat = agent.lat - normV * tailLenDeg;
      const tailLng = agent.lng - normU * tailLenDeg;

      latLngToTerrain(agent.lat, agent.lng, 0.38, _headPos);
      latLngToTerrain(tailLat, tailLng, 0.38, _tailPos);

      pArr[baseIdx] = _tailPos.x;
      pArr[baseIdx + 1] = _tailPos.y;
      pArr[baseIdx + 2] = _tailPos.z;
      pArr[baseIdx + 3] = _headPos.x;
      pArr[baseIdx + 4] = _headPos.y;
      pArr[baseIdx + 5] = _headPos.z;

      const lifeRatio = agent.age / agent.maxAge;
      const alpha = Math.sin(lifeRatio * Math.PI);

      if (mag > 22) {
        _tmpColor.copy(_cMod).lerp(_cStrong, Math.min(1, (mag - 22) / 20));
      } else {
        _tmpColor.copy(_cCalm).lerp(_cMod, Math.min(1, mag / 22));
      }

      cArr[baseIdx] = _tmpColor.r * alpha * 0.25;
      cArr[baseIdx + 1] = _tmpColor.g * alpha * 0.25;
      cArr[baseIdx + 2] = _tmpColor.b * alpha * 0.25;

      cArr[baseIdx + 3] = _tmpColor.r * alpha;
      cArr[baseIdx + 4] = _tmpColor.g * alpha;
      cArr[baseIdx + 5] = _tmpColor.b * alpha;

      if (animate) {
        const advectSpeed = 0.13 * this.globalMultiplier * agent.speedScale * dt;
        agent.lat += v * advectSpeed;
        agent.lng += u * advectSpeed;
        agent.age += 1;

        if (
          agent.age >= agent.maxAge ||
          agent.lat < DOMAIN_BOUNDS.latMin ||
          agent.lat > DOMAIN_BOUNDS.latMax ||
          agent.lng < DOMAIN_BOUNDS.lngMin ||
          agent.lng > DOMAIN_BOUNDS.lngMax
        ) {
          this.agents[i] = this.spawnAgent(false);
        }
      }
    }

    this.streamGeo.attributes.position.needsUpdate = true;
    this.streamGeo.attributes.color.needsUpdate = true;
  }

  public dispose() {
    this.streamGeo.dispose();
    this.streamMat.dispose();
    this.staticArrowGeo.dispose();
    this.staticArrowMat.dispose();
  }
}
