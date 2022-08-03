import { FragmentLoader } from "bim-fragment/fragment-loader";
import { Fragment } from "bim-fragment";
import { Components } from "../components";
import { FragmentHighlighter } from "./fragment-highlighter";

export class Fragments {
  loader = new FragmentLoader();
  fragments: Fragment[] = [];
  highlighter: FragmentHighlighter;

  constructor(private components: Components) {
    this.highlighter = new FragmentHighlighter(components);
  }

  async load(geometryURL: string, dataURL: string) {
    const fragment = await this.loader.load(geometryURL, dataURL);
    this.fragments.push(fragment);
    this.components.meshes.push(fragment.mesh);
    const scene = this.components.scene.getScene();
    scene.add(fragment.mesh);
  }

  updateHighlight() {
    this.highlighter.fragments = this.fragments;
  }
}
