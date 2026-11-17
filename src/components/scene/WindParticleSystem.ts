// ====================================================================
// MAUSAM 3D Atmospheric Wind Flow Particle & Streamline System
// Interpolates wind vectors from real regional observations (36 States/UTs)
// plus the active station/hourly timeline state, and advects line-segment
// streaks cleanly across India, Arabian Sea, and Bay of Bengal.
// ====================================================================

import * as THREE from 'three';
import { GLOBE_RADIUS, getMergedStatePoints, latLngToVector3, windDirToDegrees } from './geoMath';

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
  u: number; // eastward component
  v: number; // northward component
}

const STREAM_ALTITUDE = GLOBE_RADIUS * 1.028;

// Subcontinent + adjoining maritime atmospheric domain bounds
const DOMAIN_BOUNDS = {
  latMin: 4.5,
  latMax: 38.5,
  lngMin: 64.0,
  lngMax: 99.5,
};

export class WindParticleSystem {
  public readonly object: THREE.LineSegments;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.LineBasicMaterial;
  private readonly count: number;
  private readonly agents: ParticleAgent[] = [];
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private windSources: WindSourcePoint[] = [];
  private globalMultiplier = 1.0;

  constructor(maxParticles = 620) {
    this.count = maxParticles;
    this.positions = new Float32Array(this.count * 2 * 3);
    this.colors = new Float32Array(this.count * 2 * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.object = new THREE.LineSegments(this.geometry, this.material);
    this.object.frustumCulled = false;

    this.seedInitialWindField();
    this.initAgents();
    // Run one warm-up step so streaks have real tail lengths on frame 1 (even in reduced motion)
    this.step(0.035, 1.0, false);
  }

  private seedInitialWindField() {
    const merged = getMergedStatePoints();
    this.windSources = merged.map((pt) => {
      const deg = windDirToDegrees(pt.state.windDir);
      // Meteorological wind "from" direction -> air moves toward (deg + 180)
      const rad = ((deg + 180) * Math.PI) / 180;
      const spd = Math.max(4, pt.state.windSpeed || 12);
      return {
        lat: pt.lat,
        lng: pt.lng,
        u: Math.sin(rad) * spd,
        v: Math.cos(rad) * spd,
      };
    });
  }

  /**
   * Incorporates active selected station/timeline hourly wind telemetry into the interpolated field.
   */
  public updateLiveWindFocus(lat: number, lng: number, speedKmh?: number, dir?: string | number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const spd = typeof speedKmh === 'number' && Number.isFinite(speedKmh) ? Math.max(2, speedKmh) : 14;
    const deg = windDirToDegrees(dir);
    const rad = ((deg + 180) * Math.PI) / 180;

    // Replace or append active focus vector at index 0
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

    // Subtle visual scaling with real wind speed without exaggerating calm air
    this.globalMultiplier = THREE.MathUtils.clamp(0.75 + spd / 42, 0.7, 1.85);
  }

  private initAgents() {
    for (let i = 0; i < this.count; i++) {
      this.agents.push(this.spawnAgent(true));
    }
  }

  private spawnAgent(randomAge = false): ParticleAgent {
    const lat = DOMAIN_BOUNDS.latMin + Math.random() * (DOMAIN_BOUNDS.latMax - DOMAIN_BOUNDS.latMin);
    const lng = DOMAIN_BOUNDS.lngMin + Math.random() * (DOMAIN_BOUNDS.lngMax - DOMAIN_BOUNDS.lngMin);
    const maxAge = 45 + Math.floor(Math.random() * 55);
    return {
      lat,
      lng,
      age: randomAge ? Math.floor(Math.random() * maxAge) : 0,
      maxAge,
      speedScale: 0.8 + Math.random() * 0.45,
    };
  }

  private sampleWindVector(lat: number, lng: number): { u: number; v: number; mag: number } {
    let sumW = 0;
    let sumU = 0;
    let sumV = 0;

    // Inverse-distance weighting across regional stations (fast 36-point kernel)
    for (let i = 0; i < this.windSources.length; i++) {
      const s = this.windSources[i];
      const dLat = lat - s.lat;
      const dLng = lng - s.lng;
      const distSq = dLat * dLat + dLng * dLng + 6.5;
      const w = 1 / distSq;
      sumW += w;
      sumU += s.u * w;
      sumV += s.v * w;
    }

    const u = sumW > 0 ? sumU / sumW : 10;
    const v = sumW > 0 ? sumV / sumW : 5;
    const mag = Math.sqrt(u * u + v * v);
    return { u, v, mag };
  }

  public setIntensityVisibility(emphasis: 'primary' | 'subtle' | 'hidden', opacityScale = 1) {
    if (emphasis === 'hidden') {
      this.object.visible = false;
      return;
    }
    this.object.visible = true;
    this.material.opacity = (emphasis === 'primary' ? 0.88 : 0.34) * opacityScale;
  }

  public step(deltaSec: number, activeCountRatio = 1.0, animate = true) {
    const dt = Math.min(deltaSec, 0.05);
    const activeCount = Math.min(this.count, Math.max(40, Math.floor(this.count * activeCountRatio)));
    const pArr = this.positions;
    const cArr = this.colors;

    // Color stops: calm teal (#36C6B0) -> brisk cyan (#35C7E8) -> strong amber (#E8B64D)
    const cCalm = new THREE.Color('#36C6B0');
    const cMod = new THREE.Color('#35C7E8');
    const cStrong = new THREE.Color('#E8B64D');
    const tmpColor = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const baseIdx = i * 6;
      if (i >= activeCount) {
        pArr[baseIdx] = 0;
        pArr[baseIdx + 1] = 0;
        pArr[baseIdx + 2] = 0;
        pArr[baseIdx + 3] = 0;
        pArr[baseIdx + 4] = 0;
        pArr[baseIdx + 5] = 0;
        continue;
      }

      let agent = this.agents[i];
      const { u, v, mag } = this.sampleWindVector(agent.lat, agent.lng);

      // Compute head and tail geographic coordinates along vector
      const headLat = agent.lat;
      const headLng = agent.lng;
      const tailLenDeg = 0.042 * Math.max(6, mag) * this.globalMultiplier;
      const normU = mag > 0.001 ? u / mag : 1;
      const normV = mag > 0.001 ? v / mag : 0;

      const tailLat = headLat - normV * tailLenDeg;
      const tailLng = headLng - normU * tailLenDeg;

      const headPos = latLngToVector3(headLat, headLng, STREAM_ALTITUDE);
      const tailPos = latLngToVector3(tailLat, tailLng, STREAM_ALTITUDE);

      pArr[baseIdx] = tailPos.x;
      pArr[baseIdx + 1] = tailPos.y;
      pArr[baseIdx + 2] = tailPos.z;
      pArr[baseIdx + 3] = headPos.x;
      pArr[baseIdx + 4] = headPos.y;
      pArr[baseIdx + 5] = headPos.z;

      // Fade particle at start and end of life cycle
      const lifeRatio = agent.age / agent.maxAge;
      const alpha = Math.sin(lifeRatio * Math.PI);

      if (mag > 22) {
        tmpColor.copy(cMod).lerp(cStrong, Math.min(1, (mag - 22) / 22));
      } else {
        tmpColor.copy(cCalm).lerp(cMod, Math.min(1, mag / 22));
      }

      // Dim tail slightly more than head for clear directional cue
      cArr[baseIdx] = tmpColor.r * alpha * 0.35;
      cArr[baseIdx + 1] = tmpColor.g * alpha * 0.35;
      cArr[baseIdx + 2] = tmpColor.b * alpha * 0.35;

      cArr[baseIdx + 3] = tmpColor.r * alpha;
      cArr[baseIdx + 4] = tmpColor.g * alpha;
      cArr[baseIdx + 5] = tmpColor.b * alpha;

      if (animate) {
        const advectSpeed = 0.12 * this.globalMultiplier * agent.speedScale * dt;
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

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
