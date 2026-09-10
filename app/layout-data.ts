import {catalog,type FurnitureRecord} from './furniture-library';
const originals=['sectional','rug','media','side-table','desk','office-chair','timber-bed','dining-table','shelving'];
export function validLayout(value:unknown):value is FurnitureRecord[]{
 if(!Array.isArray(value)||value.length>100)return false;
 const ids=new Set<string>();return value.every(v=>{if(!v||typeof v.id!=='string'||v.id.length>80||ids.has(v.id)||typeof v.name!=='string'||v.name.length>100||typeof v.visible!=='boolean'||![v.x,v.z,v.rotation].every(Number.isFinite)||Math.abs(v.x)>15||Math.abs(v.z)>15||Math.abs(v.rotation)>1000)return false;ids.add(v.id);return v.kind==='original'?originals.includes(v.id):catalog.some(c=>c.id===v.kind)&&!originals.includes(v.id)})&&originals.every(id=>ids.has(id));
}
