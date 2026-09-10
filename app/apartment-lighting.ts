import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

type Apartment = {
  group: THREE.Group;
  ceiling: THREE.Group;
  context: THREE.Group;
};
type Probe = {
  id: string;
  position: THREE.Vector3;
  day?: THREE.WebGLRenderTarget;
  evening?: THREE.WebGLRenderTarget;
};
type Assignment = {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
};
type MaterialBinding = { source: THREE.MeshStandardMaterial; material: THREE.MeshStandardMaterial; probe: Probe };

/**
 * Window illumination plus cached, apartment-specific reflection/IBL captures.
 * These are static radiance probes, not a GI lightmap or a path-traced solution.
 * All six faces of one room are captured per step; no probes are captured while
 * walking once the initial queue is complete. Call refresh after texture loads.
 */
export function createApartmentLighting(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  model: Apartment,
  options: {
    probeSize?: 64 | 128 | 256;
    onProgress?: (completed: number, total: number) => void;
    onError?: (error: unknown) => void;
  } = {},
) {
  RectAreaLightUniformsLib.init();
  const rig = new THREE.Group();
  rig.name = 'Window light and apartment reflection probes';
  scene.add(rig);
  const originalEnvironment = scene.environment;
  const originalEnvironmentIntensity = scene.environmentIntensity;
  const originalBackground = scene.background;
  const originalExposure = renderer.toneMappingExposure;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  let disposed = false;
  let daylight = true;
  let completed = 0;
  const probes: Probe[] = [
    { id: 'living', position: new THREE.Vector3(2.1, 1.28, 5.5) },
    { id: 'dining', position: new THREE.Vector3(5.85, 1.35, 4.9) },
    { id: 'kitchen', position: new THREE.Vector3(5.95, 1.35, 8.35) },
    { id: 'bedroom', position: new THREE.Vector3(5.15, 1.4, 1.9) },
    { id: 'bedroom2', position: new THREE.Vector3(1.4, 1.35, 1.8) },
    { id: 'bathroom', position: new THREE.Vector3(3.4, 1.4, 1.4) },
    { id: 'laundry', position: new THREE.Vector3(5.85, 1.35, 10.2) },
  ];
  let queue = [...probes];
  const sky = new THREE.HemisphereLight('#d9e8ff', '#a49a86', .3);
  rig.add(sky);
  const sun = new THREE.DirectionalLight('#fff0d5', 3.1);
  sun.name = 'Daylight through real openings';
  sun.position.set(-4.5, 6.5, -3);
  sun.target.position.set(3.3, 0, 5.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 9, bottom: -9, near: .1, far: 28 });
  sun.shadow.bias = -.00012;
  sun.shadow.normalBias = .012;
  rig.add(sun, sun.target);

  const windows: THREE.RectAreaLight[] = [];
  function windowLight(x: number, y: number, z: number, w: number, h: number, target: [number, number, number], strength: number) {
    const light = new THREE.RectAreaLight('#dfebff', strength, w, h);
    light.position.set(x, y, z);
    light.lookAt(...target);
    light.userData.dayIntensity = strength;
    light.name = 'Diffuse window light';
    windows.push(light);
    rig.add(light);
  }
  // Centres and dimensions follow the actual window openings in the model.
  windowLight(.04, 1.27, 6.25, 2.25, 2.08, [3, 1.1, 6.25], 3.6);
  windowLight(1.275, 1.63, .04, 1.65, 1.18, [1.275, 1.2, 2], 3.0);
  windowLight(5.75, 1.63, .04, 1.8, 1.18, [5.75, 1.2, 2], 3.0);
  windowLight(3.525, 1.825, .04, 1.39, .95, [3.525, 1.2, 2], 1.7);
  windowLight(7.06, 1.63, 4.975, 1.85, 1.2, [5, 1.2, 4.975], 2.7);
  windowLight(7.06, 1.675, 8.5, 1.3, 1.07, [5.8, 1.2, 8.5], 2.8);
  windowLight(7.06, 1.705, 10.4, .7, .95, [5.8, 1.2, 10.4], 1.7);

  const fixtures: THREE.PointLight[] = [];
  for (const p of [[2.4, 2.2, 5.6], [5.95, 2.35, 7.8], [1.3, 2.2, 1.7], [5.8, 2.2, 1.7], [3.55, 2.35, 1.4], [5.95, 2.35, 10.3]]) {
    const light = new THREE.PointLight('#ffe5bd', 1.2, 4.8, 2);
    light.position.set(p[0], p[1], p[2]);
    light.name = 'Ceiling practical';
    fixtures.push(light);
    rig.add(light);
  }

  function probeAt(position: THREE.Vector3): Probe {
    const { x, z } = position;
    if (z < 3.5) return x < 2.7 ? probes[4] : x < 4.4 ? probes[5] : probes[3];
    if (x > 4.8) return z >= 9.7 ? probes[6] : z >= 6.2 ? probes[2] : probes[1];
    return probes[0];
  }
  const assignments: Assignment[] = [];
  const bindings: MaterialBinding[] = [];
  const copies = new Map<string, THREE.MeshStandardMaterial>();
  const dynamicGroups=new Map<THREE.Object3D,THREE.MeshStandardMaterial[]>();
  const dynamicBindings=new Map<THREE.MeshStandardMaterial,Probe>();
  const meshPosition = new THREE.Vector3();
  model.group.updateMatrixWorld(true);
  model.group.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.Mesh & { isReflector?: boolean }).isReflector) return;
    mesh.getWorldPosition(meshPosition);
    const probe = probeAt(meshPosition);
    const original = mesh.material;
    const surfaces=Array.isArray(original)?original:[original];
    if(surfaces.some(m=>m.transparent&&m.opacity<.3))mesh.castShadow=false;
    function localMaterial(source: THREE.Material) {
      if (!(source as THREE.MeshStandardMaterial).isMeshStandardMaterial) return source;
      const standard = source as THREE.MeshStandardMaterial;
      const key = `${source.uuid}:${probe.id}`;
      let material = copies.get(key);
      if (!material) {
        material = standard.clone();
        material.name = `${source.name || 'Surface'} / ${probe.id} reflection`;
        material.envMap = null;
        material.envMapIntensity = .72;
        copies.set(key, material);
        bindings.push({ source: standard, material, probe });
      }
      return material;
    }
    mesh.material = Array.isArray(original) ? original.map(localMaterial) : localMaterial(original);
    assignments.push({ mesh, original });
  });

  const captureHidden: THREE.Object3D[] = [];
  model.group.traverse(object => {
    // Planar mirror recursion creates six additional captures; omit it from
    // probe baking and retain its live reflection in the main render.
    if ((object as THREE.Object3D & { isReflector?: boolean }).isReflector) captureHidden.push(object);
  });
  function environmentFor(probe: Probe) { return daylight ? probe.day : probe.evening; }
  function applyProbes() {
    scene.environment = null;
    for (const { material, probe } of bindings) {
      const next = environmentFor(probe)?.texture ?? null;
      const changeShader = Boolean(material.envMap) !== Boolean(next);
      material.envMap = next;
      // Explicit per-material IBL strength, independent of scene.environment.
      material.envMapIntensity = .72;
      if (changeShader) material.needsUpdate = true;
    }
    for(const [material,probe] of dynamicBindings){const next=environmentFor(probe)?.texture??null;if(Boolean(material.envMap)!==Boolean(next))material.needsUpdate=true;material.envMap=next;material.envMapIntensity=.72}
  }
  function syncFurniture(){
    for(const object of model.group.children){if(!object.userData.furnitureId)continue;let surfaces=dynamicGroups.get(object);if(!surfaces){surfaces=[];const localCopies=new Map<THREE.Material,THREE.MeshStandardMaterial>();object.traverse(child=>{const mesh=child as THREE.Mesh;if(!mesh.isMesh)return;const local=(source:THREE.Material)=>{if(!(source as THREE.MeshStandardMaterial).isMeshStandardMaterial)return source;let copy=localCopies.get(source);if(!copy){copy=(source as THREE.MeshStandardMaterial).clone();copy.envMap=null;copy.needsUpdate=true;localCopies.set(source,copy);surfaces!.push(copy)}return copy};mesh.material=Array.isArray(mesh.material)?mesh.material.map(local):local(mesh.material)});dynamicGroups.set(object,surfaces)}object.getWorldPosition(meshPosition);const probe=probeAt(meshPosition);surfaces.forEach(m=>dynamicBindings.set(m,probe))}
    for(const [object,surfaces] of dynamicGroups)if(!object.parent){surfaces.forEach(m=>{dynamicBindings.delete(m);m.dispose()});dynamicGroups.delete(object)}
    refresh();
  }
  function setDaylight(day: boolean) {
    if (disposed) return;
    const changed = daylight !== day;
    daylight = day;
    sun.intensity = day ? 1.9 : .16;
    sky.intensity = day ? .34 : .16;
    for (const light of windows) light.intensity = light.userData.dayIntensity * (day ? 1.2 : .12);
    for (const light of fixtures) light.intensity = day ? 1.2 : 7;
    renderer.toneMappingExposure = day ? 1.42 : 1.12;
    scene.background = new THREE.Color(day ? '#c5d5e2' : '#526479');
    if (changed) {
      queue = probes.filter(probe => !environmentFor(probe));
      completed = probes.length - queue.length;
      renderer.shadowMap.needsUpdate = true;
    }
    applyProbes();
  }
  setDaylight(true);

  function refresh(copySourceMaterials = false) {
    if (disposed) return;
    // The texture updater normally edits the current live mesh materials.
    // Preserve those updates by default. Opt in only if the caller instead
    // updated the original materials retained outside this module.
    if (copySourceMaterials) {
      for (const { source, material } of bindings) {
        material.copy(source);
        material.envMap = null;
        material.needsUpdate = true;
      }
    }
    for (const probe of probes) {
      probe.day?.dispose();
      probe.evening?.dispose();
      probe.day = undefined;
      probe.evening = undefined;
    }
    completed = 0;
    queue = [...probes];
    applyProbes();
  }

  /** Capture at most one room. Invoke before the main renderer.render call. */
  function step() {
    if (disposed || queue.length === 0) return false;
    const probe = queue.shift()!;
    const oldCeiling = model.ceiling.visible;
    const oldContext = model.context.visible;
    const oldVisibility = captureHidden.map(object => object.visible);
    const oldShadowAutoUpdate = renderer.shadowMap.autoUpdate;
    const oldTarget = renderer.getRenderTarget();
    const oldCubeFace = renderer.getActiveCubeFace();
    const oldMipmapLevel = renderer.getActiveMipmapLevel();
    const oldAutoClear = renderer.autoClear;
    const oldToneMapping = renderer.toneMapping;
    const oldBackground = scene.background;
    const oldXrEnabled = renderer.xr.enabled;
    try {
      // Capture the enclosed apartment even if the current UI is dollhouse.
      model.ceiling.visible = true;
      model.context.visible = true;
      captureHidden.forEach(object => { object.visible = false; });
      scene.environment = null;
      // A consistent direct-light capture avoids recursive probe feedback and
      // prevents later rooms receiving more synthetic bounces than earlier ones.
      for (const { material } of bindings) {
        if (material.envMap) material.needsUpdate = true;
        material.envMap = null;
      }
      for(const material of dynamicBindings.keys()){if(material.envMap)material.needsUpdate=true;material.envMap=null}
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
      renderer.autoClear = true;
      scene.updateMatrixWorld(true);
      const target = pmrem.fromScene(scene, 0, .055, 110, {
        size: options.probeSize ?? 128,
        position: probe.position,
      });
      if (daylight) { probe.day?.dispose(); probe.day = target; }
      else { probe.evening?.dispose(); probe.evening = target; }
      completed++;
      options.onProgress?.(completed, probes.length);
    } catch (error) {
      // Keep navigation and the direct-light render operational if a device
      // cannot allocate the HDR probe targets. No repeated failing work.
      queue = [];
      if (options.onError) options.onError(error);
      else console.warn('Apartment reflection capture is unavailable.', error);
    } finally {
      model.ceiling.visible = oldCeiling;
      model.context.visible = oldContext;
      captureHidden.forEach((object, i) => { object.visible = oldVisibility[i]; });
      renderer.shadowMap.autoUpdate = oldShadowAutoUpdate;
      renderer.shadowMap.needsUpdate = true;
      renderer.autoClear = oldAutoClear;
      renderer.toneMapping = oldToneMapping;
      renderer.xr.enabled = oldXrEnabled;
      scene.background = oldBackground;
      renderer.setRenderTarget(oldTarget, oldCubeFace, oldMipmapLevel);
      applyProbes();
    }
    return true;
  }

  /** Await the model's explicit texture promise; never use a guessed timeout. */
  async function afterTextures(ready: Promise<unknown>) {
    await ready;
    if (!disposed) refresh();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    queue = [];
    for (const { mesh, original } of assignments) mesh.material = original;
    for (const { material } of bindings) material.dispose();
    for(const surfaces of dynamicGroups.values())surfaces.forEach(m=>m.dispose());dynamicBindings.clear();dynamicGroups.clear();
    for (const probe of probes) { probe.day?.dispose(); probe.evening?.dispose(); }
    sun.shadow.map?.dispose();
    sun.shadow.mapPass?.dispose();
    scene.remove(rig);
    scene.environment = originalEnvironment;
    scene.environmentIntensity = originalEnvironmentIntensity;
    scene.background = originalBackground;
    renderer.toneMappingExposure = originalExposure;
    pmrem.dispose();
  }
  return { step, refresh, syncFurniture, afterTextures, setDaylight, dispose, sun, sky, rig, probes, get pending() { return queue.length; } };
}


