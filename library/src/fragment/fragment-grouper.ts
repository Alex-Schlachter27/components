import { Fragments } from "./fragment";
import { Disposable } from "../core";

// TODO: Clean up and document

export interface ItemGroupSystems {
  [systemName: string]: { [groupName: string]: string[] };
}

export interface GroupSystems {
  [systemName: string]: { [groupName: string]: { [guid: string]: string[] } };
}

export class FragmentGrouper implements Disposable {
  groupSystems: GroupSystems = {
    category: {},
    floor: {},
  };

  private _fragments: Fragments;

  constructor(fragments: Fragments) {
    this._fragments = fragments;
  }

  dispose() {
    this.groupSystems = {};
  }

  add(guid: string, groupsSystems: ItemGroupSystems) {
    for (const system in groupsSystems) {
      if (!this.groupSystems[system]) {
        this.groupSystems[system] = {};
      }
      const existingGroups = this.groupSystems[system];
      const currentGroups = groupsSystems[system];
      for (const groupName in currentGroups) {
        if (!existingGroups[groupName]) {
          existingGroups[groupName] = {};
        }
        existingGroups[groupName][guid] = currentGroups[groupName];
      }
    }
  }

  setVisibility(systemName: string, groupName: string, visible: boolean) {
    const fragmentsMap = this.groupSystems[systemName][groupName];
    for (const fragmentId in fragmentsMap) {
      const fragment = this._fragments.list[fragmentId];
      const ids = fragmentsMap[fragmentId];
      fragment.setVisibility(ids, visible);
    }
  }

  remove(guid: string) {
    for (const systemName in this.groupSystems) {
      const system = this.groupSystems[systemName];
      for (const groupName in system) {
        const group = system[groupName];
        delete group[guid];
      }
    }
  }

  get(filter: { [name: string]: string }) {
    const models: { [fragmentGuid: string]: string[] } = {};
    for (const name in filter) {
      const value = filter[name];
      const found = this.groupSystems[name][value];
      if (found) {
        for (const guid in found) {
          if (!models[guid]) {
            models[guid] = [];
          }
          models[guid].push(...found[guid]);
        }
      }
    }
    return models;
  }
}
