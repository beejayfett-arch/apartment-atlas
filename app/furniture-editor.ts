import * as THREE from 'three';
import {makeFurniture,catalog,type FurnitureRecord} from './furniture-library';
import type {buildApartment} from './apartment-model';
export type EditorState={items:FurnitureRecord[];selected:string|null;canUndo:boolean;canRedo:boolean;message:string};
export function createFurnitureEditor(model:ReturnType<typeof buildApartment>,scene:THREE.Scene,camera:THREE.Camera,canvas:HTMLCanvasElement,invalidate:()=>void,orbit:(enabled:boolean)=>void){
 const objects=new Map(model.editable.map(o=>[o.userData.furnitureId as string,o]));
 let active=false,selected:string|null=null,dragging=false,dragChanged=false,message='',dragBefore: FurnitureRecord[]=[];
 const history:FurnitureRecord[][]=[],future:FurnitureRecord[][]=[];
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),offset=new THREE.Vector3();
 const selection=new THREE.BoxHelper(new THREE.Group(),0x8fe9c4);selection.visible=false;scene.add(selection);
 const serialize=():FurnitureRecord[]=>Array.from(objects,([id,o])=>({id,kind:o.userData.kind||'original',name:o.name,x:o.position.x,z:o.position.z,rotation:o.rotation.y,visible:o.visible}));
 const initial=serialize();
 function emit(){if(selected&&objects.get(selected)?.visible&&active){selection.setFromObject(objects.get(selected)!);selection.visible=true}else selection.visible=false;invalidate();window.dispatchEvent(new CustomEvent('atlas-editor-state',{detail:{items:serialize(),selected,canUndo:history.length>0,canRedo:future.length>0,message} satisfies EditorState}))}
 function disposeObject(o:THREE.Object3D){const mats=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();o.traverse(child=>{const m=child as THREE.Mesh;m.geometry?.dispose();if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])mats.add(mat)});for(const m of mats){for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose()}textures.forEach(t=>t.dispose())}
 function apply(items:FurnitureRecord[]){for(const [id,o]of objects){if(!items.some(i=>i.id===id)){if(o.userData.kind){o.removeFromParent();disposeObject(o);objects.delete(id)}else o.visible=false}}for(const v of items){let o=objects.get(v.id);if(!o&&catalog.some(c=>c.id===v.kind)){o=makeFurniture(v.kind);o.userData.furnitureId=v.id;objects.set(v.id,o);model.group.add(o)}if(o){o.position.set(v.x,0,v.z);o.rotation.y=v.rotation;o.visible=v.visible}}if(!objects.get(selected||'')?.visible)selected=null;emit()}
 function remember(before=serialize()){history.push(before);if(history.length>50)history.shift();future.length=0}
 function bounds(o:THREE.Object3D){o.updateWorldMatrix(true,true);return new THREE.Box3().setFromObject(o)}
 function valid(o:THREE.Object3D){const b=bounds(o);const body=b.min.x>=.08&&b.max.x<=7.02&&b.min.z>=.08&&b.max.z<=10.92&&(b.max.z<=7.82||b.min.x>=4.88);const balcony=b.min.x>=-1.3&&b.max.x<=-.08&&b.min.z>=5&&b.max.z<=7.8;if(!body&&!balcony)return false;return !model.colliders.some(c=>b.min.x<c.maxX-.015&&b.max.x>c.minX+.015&&b.min.z<c.maxZ-.015&&b.max.z>c.minZ+.015)}
 function position(o:THREE.Object3D,x:number,z:number,rotation=o.rotation.y){const before=o.position.clone(),old=o.rotation.y;o.position.set(Math.round(x*20)/20,0,Math.round(z*20)/20);o.rotation.y=rotation;if(!valid(o)){o.position.copy(before);o.rotation.y=old;message='That position crosses a wall or fixed fitting.';return false}message='Position updated · 5 cm grid';return true}
 function floor(e:PointerEvent){const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return ray.ray.intersectPlane(plane,new THREE.Vector3())}
 function down(e:PointerEvent){if(!active||e.button!==0)return;floor(e);const hits=ray.intersectObjects(Array.from(objects.values()).filter(o=>o.visible),true);let target:THREE.Object3D|undefined=hits[0]?.object;while(target&&!target.userData.furnitureId)target=target.parent||undefined;if(!target){selected=null;emit();return}e.stopImmediatePropagation();orbit(false);selected=target.userData.furnitureId;const p=floor(e);if(p){offset.copy(target.position).sub(p);dragBefore=serialize();dragging=true;dragChanged=false;canvas.setPointerCapture(e.pointerId)}emit()}
 function move(e:PointerEvent){if(!dragging)return;const p=floor(e),o=objects.get(selected!);if(p&&o){const before=o.position.clone();position(o,p.x+offset.x,p.z+offset.z);if(!o.position.equals(before))dragChanged=true;emit()}}
 function up(){if(!dragging)return;dragging=false;orbit(true);if(dragChanged)remember(dragBefore);emit()}
 function action(e:Event){const a=(e as CustomEvent).detail;if(a.type==='request'){emit();return}if(!active&&a.type!=='load')return;const o=objects.get(selected||'');message='';
  if(a.type==='select'){selected=objects.has(a.id)?a.id:null;emit();return}
  if(a.type==='undo'&&history.length){future.push(serialize());apply(history.pop()!);return}
  if(a.type==='redo'&&future.length){history.push(serialize());apply(future.pop()!);return}
  if(a.type==='load'){remember();apply(a.items);message='Layout loaded';emit();return}
  if(a.type==='reset'){remember();apply(initial);message='Original furniture restored';emit();return}
  if(a.type==='add'||a.type==='replace'){
   if(!catalog.some(c=>c.id===a.kind)||(a.type==='replace'&&!o))return;
   const item=makeFurniture(a.kind),id=crypto.randomUUID();item.userData.furnitureId=id;const room=model.rooms.find(r=>r.id===a.room)||model.rooms[0];item.position.set(o&&a.type==='replace'?o.position.x:room.position[0],0,o&&a.type==='replace'?o.position.z:room.position[2]);if(o&&a.type==='replace')item.rotation.y=o.rotation.y;model.group.add(item);
   if(!valid(item)){let found=false;const origin=item.position.clone();for(let radius=.2;radius<2&&!found;radius+=.2)for(let angle=0;angle<Math.PI*2&&!found;angle+=Math.PI/4){item.position.set(origin.x+Math.cos(angle)*radius,0,origin.z+Math.sin(angle)*radius);found=valid(item)}if(!found){item.removeFromParent();disposeObject(item);message='No clear space here. Choose a larger room.';emit();return}}
   remember();if(o&&a.type==='replace')o.visible=false;objects.set(id,item);selected=id;message=a.type==='replace'?'Furniture replaced':'Furniture added';emit();return
  }
  if(o&&a.type==='remove'){remember();o.visible=false;selected=null;message='Furniture removed';emit();return}
  if(o&&(a.type==='move'||a.type==='rotate')){const before=serialize();if(position(o,o.position.x+(a.dx||0),o.position.z+(a.dz||0),o.rotation.y+(a.angle||0)))remember(before);emit()}
 }
 const key=(e:KeyboardEvent)=>{if(!active||(e.target instanceof Element&&e.target.closest('input,select,textarea,button,[role=dialog]')))return;const actions:Record<string,object>={ArrowLeft:{type:'move',dx:-.1},ArrowRight:{type:'move',dx:.1},ArrowUp:{type:'move',dz:-.1},ArrowDown:{type:'move',dz:.1},r:{type:'rotate',angle:Math.PI/12},Delete:{type:'remove'}};if(actions[e.key]){e.preventDefault();action(new CustomEvent('action',{detail:actions[e.key]}))}};
 canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);window.addEventListener('atlas-edit',action);window.addEventListener('keydown',key);
 return {setActive(v:boolean){active=v;if(!v)up();emit()},collides(x:number,z:number){for(const o of objects.values()){if(!o.visible)continue;if(o.userData.colliderParts?.length){const p=new THREE.Vector3(x,0,z);o.updateWorldMatrix(true,false);o.worldToLocal(p);if(o.userData.colliderParts.some((c:any)=>p.x>c.minX-.15&&p.x<c.maxX+.15&&p.z>c.minZ-.15&&p.z<c.maxZ+.15))return true}else{const b=bounds(o);if(b.max.y>.18&&x>b.min.x-.15&&x<b.max.x+.15&&z>b.min.z-.15&&z<b.max.z+.15)return true}}return false},dispose(){selection.geometry.dispose();(selection.material as THREE.Material).dispose();selection.removeFromParent();canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);window.removeEventListener('atlas-edit',action);window.removeEventListener('keydown',key)}};
}
