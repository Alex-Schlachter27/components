import * as WEBIFC from "web-ifc";
import { IfcToFragmentItems, MaterialList } from "./base-types";
import { Settings } from "./settings";
import { LoadProgress } from "./load-progress";
import { Geometry } from "./geometry";
import { DataConverter } from "./data-converter";

/**
 * Reads all the geometry of the IFC file and generates an optimized `THREE.Mesh`.
 */
export class IfcFragmentLoader {
  settings = new Settings();

  private _webIfc = new WEBIFC.IfcAPI();
  private _progress = new LoadProgress();
  private _items: IfcToFragmentItems = {};
  private _materials: MaterialList = {};

  private readonly _geometry = new Geometry(
    this._webIfc,
    this._items,
    this._materials
  );

  private readonly _converter = new DataConverter(
    this._items,
    this._materials,
    this.settings
  );

  get progress() {
    return this._progress.event;
  }

  async load(ifcURL: URL) {
    await this.initializeWebIfc();
    const file = await fetch(ifcURL);
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    await this._webIfc.OpenModel(data, this.settings.webIfc);
    return this.loadAllGeometry();
  }

  private async initializeWebIfc() {
    this._webIfc.SetWasmPath(this.settings.wasmPath);
    await this._webIfc.Init();
  }

  private async loadAllGeometry() {
    await this._progress.setupLoadProgress(this._webIfc);
    this.loadAllCategories();
    const model = await this._converter.generateFragmentData(this._webIfc);
    this._progress.updateLoadProgress();
    this.cleanUp();
    return model;
  }

  private loadAllCategories() {
    this._converter.setupCategories(this._webIfc);
    this.loadOptionalCategories();
    this.loadMainCategories();
  }

  private async loadMainCategories() {

    const voidsList: any = [];
    const voids = this._webIfc.GetLineIDsWithType(0, WEBIFC.IFCRELVOIDSELEMENT);
    for (let i = 0; i < voids.size(); i++) {
      const voidsParameters = await this._webIfc.properties.getItemProperties(0, voids.get(i));
      const voidElement = voidsParameters.RelatingBuildingElement.value;
      if (voidsList.indexOf(voidElement) == -1) {
        voidsList.push(voidElement);
      }
    }
    this._geometry.setVoids(voidsList);
    this._webIfc.StreamAllMeshes(0, (mesh: WEBIFC.FlatMesh) => {
      this._progress.updateLoadProgress();
      this._geometry.streamMesh(this._webIfc, mesh);
    });
  }

  // Some categories (like IfcSpace) need to be set explicitly
  private loadOptionalCategories() {
    const optionals = this.settings.optionalCategories;
    const callback = (mesh: WEBIFC.FlatMesh) => {
      this._geometry.streamMesh(this._webIfc, mesh);
    };
    this._webIfc.StreamAllMeshesWithTypes(0, optionals, callback);
  }

  private cleanUp() {
    this.resetWebIfc();
    this._geometry.cleanUp();
    this._converter.cleanUp();
    this.resetObject(this._items);
    this.resetObject(this._materials);
  }

  private resetWebIfc() {
    (this._webIfc as any) = null;
    this._webIfc = new WEBIFC.IfcAPI();
  }

  private resetObject(object: any) {
    const keys = Object.keys(object);
    for (const key of keys) {
      delete object[key];
    }
  }
}
