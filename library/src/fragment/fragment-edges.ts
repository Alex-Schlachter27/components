import {
  EdgesGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Object3D,
} from "three";
import { Fragment } from "bim-fragment";
import { Components } from "../components";
import { Disposable, Disposer } from "../core";

// TODO: Clean up and document

export class FragmentEdges implements Disposable {
  edgesList: { [guid: string]: LineSegments } = {};
  edgesToUpdate = new Set<string>();
  threshold = 80;

  private _mat4 = new Matrix4();
  private _dummy = new Object3D();
  private _pos: number[] = [];
  private _rot: number[] = [];
  private _scl: number[] = [];

  private lineMat = new LineBasicMaterial({
    color: 0x555555,
    // @ts-ignore
    onBeforeCompile: (shader) => {
      shader.vertexShader = `
    attribute vec3 instT;
    attribute vec4 instR;
    attribute vec3 instS;
    
    // http://barradeau.com/blog/?p=1109
    vec3 trs( inout vec3 position, vec3 T, vec4 R, vec3 S ) {
        position *= S;
        position += 2.0 * cross( R.xyz, cross( R.xyz, position ) + R.w * position );
        position += T;
        return position;
    }
    ${shader.vertexShader}
`.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
      transformed = trs(transformed, instT, instR, instS);
`
      );
    },
  });

  private _components: Components;
  private disposer = new Disposer();

  constructor(components: Components) {
    this._components = components;
  }

  dispose() {
    for (const guid in this.edgesList) {
      const edges = this.edgesList[guid];
      this.disposer.dispose(edges, true);
    }
    this.lineMat.dispose();
    this.edgesList = {};
    this.edgesToUpdate.clear();
  }

  generate(fragment: Fragment) {
    if (this.edgesList[fragment.id]) {
      const previous = this.edgesList[fragment.id];
      previous.removeFromParent();
      previous.geometry.dispose();
      (previous.geometry as any) = null;
      delete this.edgesList[fragment.id];
    }

    this.getInstanceTransforms(fragment);

    const edgesGeom = new EdgesGeometry(fragment.mesh.geometry, this.threshold);
    const lineGeom = new InstancedBufferGeometry().copy(edgesGeom);
    lineGeom.instanceCount = Infinity;

    this.setAttributes(lineGeom);

    const lines = new LineSegments(lineGeom, this.lineMat);
    lines.frustumCulled = false;

    const scene = this._components.scene.get();
    scene.add(lines);
    this.edgesList[fragment.id] = lines;

    this.updateInstancedEdges(fragment, lineGeom);

    lines.visible = false;

    return lines;
  }

  private updateInstancedEdges(
    fragment: Fragment,
    lineGeom: InstancedBufferGeometry
  ) {
    for (let i = 0; i < fragment.mesh.count; i++) {
      fragment.mesh.getMatrixAt(i, this._mat4);
      this._mat4.decompose(
        this._dummy.position,
        this._dummy.quaternion,
        this._dummy.scale
      );
      this.linesTRS(i, this._dummy, lineGeom);
    }
  }

  private setAttributes(lineGeom: InstancedBufferGeometry) {
    lineGeom.setAttribute(
      "instT",
      new InstancedBufferAttribute(new Float32Array(this._pos), 3)
    );

    lineGeom.setAttribute(
      "instR",
      new InstancedBufferAttribute(new Float32Array(this._rot), 4)
    );

    lineGeom.setAttribute(
      "instS",
      new InstancedBufferAttribute(new Float32Array(this._scl), 3)
    );

    this._pos.length = 0;
    this._rot.length = 0;
    this._scl.length = 0;
  }

  private getInstanceTransforms(fragment: Fragment) {
    for (let i = 0; i < fragment.mesh.count; i++) {
      fragment.getInstance(i, this._dummy.matrix);
      this._dummy.updateMatrix();
      this._pos.push(
        this._dummy.position.x,
        this._dummy.position.y,
        this._dummy.position.z
      );
      this._rot.push(
        this._dummy.quaternion.x,
        this._dummy.quaternion.y,
        this._dummy.quaternion.z,
        this._dummy.quaternion.w
      );
      this._scl.push(
        this._dummy.scale.x,
        this._dummy.scale.y,
        this._dummy.scale.z
      );
    }
  }

  linesTRS(index: any, o: any, lineGeom: any) {
    lineGeom.attributes.instT.setXYZ(
      index,
      o.position.x,
      o.position.y,
      o.position.z
    );
    lineGeom.attributes.instT.needsUpdate = true;
    lineGeom.attributes.instR.setXYZW(
      index,
      o.quaternion.x,
      o.quaternion.y,
      o.quaternion.z,
      o.quaternion.w
    );
    lineGeom.attributes.instR.needsUpdate = true;
    lineGeom.attributes.instS.setXYZ(index, o.scale.x, o.scale.y, o.scale.z);
    lineGeom.attributes.instS.needsUpdate = true;
  }
}
