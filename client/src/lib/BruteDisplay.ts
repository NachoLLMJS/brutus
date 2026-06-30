// Porteado de LaBrute (`labrute/client/src/utils/BruteDisplay.ts`).
// Adaptado a nuestro core (sin @labrute/prisma; gender = 'male'|'female' string).

import {
  type BruteBodyPart,
  readBodyString,
  readColorString,
  type BruteGender,
} from 'core';
import {
  type FramePart,
  type Symbol as LaBruteSymbol,
  type Svg,
  Symbol460,
  Symbol752,
} from 'labrute-static-fla-parser';
import * as PIXI from 'pixi.js';
import { Filter, Matrix, Texture } from 'pixi.js';

const FEMALE_SYMBOL = Symbol752;
const MALE_SYMBOL = Symbol460;

type SvgsToLoad = {
  svg: Svg;
  count: number;
}[];

const matrixFromObject = (obj: FramePart['transform'], scale = 1) =>
  new Matrix(
    obj?.a ?? 1,
    obj?.b ?? 0,
    obj?.c ?? 0,
    obj?.d ?? 1,
    (obj?.tx ?? 0) * scale,
    (obj?.ty ?? 0) * scale,
  );

const ColorOffsetShader = `
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform vec3 offset;
uniform vec3 mult;

void main(void){
  vec4 color = texture2D(uSampler, vTextureCoord);
  gl_FragColor = vec4(vec3((color.r / color.a) * mult.r + offset.r / 255.0, (color.g / color.a) * mult.g + offset.g / 255.0, (color.b / color.a) * mult.b + offset.b / 255.0) * color.a, color.a);
}
`;

type Colors = {
  col0: string;
  col0a: string;
  col0c: string;
  col1: string;
  col1a: string;
  col1b: string;
  col1c: string;
  col1d: string;
  col2: string;
  col2a: string;
  col2b: string;
  col3: string;
  col3b: string;
  col4: string;
  col4a: string;
  col4b: string;
};

export default class BruteDisplay {
  gender: BruteGender;

  #colors: Colors;

  #parts: Record<BruteBodyPart, number>;

  readonly #looking: 'left' | 'right';

  container: PIXI.Container;

  svgs: PIXI.Sprite[] = [];

  #pendingSvgs: number = 0;

  #usedSvgs: Record<string, number> = {};

  #scale: number;

  #onLoad: (() => void) | undefined;

  constructor(
    gender: BruteGender,
    colors: string,
    parts: string,
    looking: 'left' | 'right' = 'left',
    scale = 1,
  ) {
    this.#colors = readColorString(gender, colors);
    this.#parts = readBodyString(parts);
    this.#looking = looking;
    this.gender = gender;
    this.#scale = scale;
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    this.#initialize();
  }

  #initialize() {
    const maleContainer = new PIXI.Container();
    maleContainer.sortableChildren = true;
    maleContainer.name = 'male';
    this.container.addChild(maleContainer);

    const femaleContainer = new PIXI.Container();
    femaleContainer.sortableChildren = true;
    femaleContainer.name = 'female';
    this.container.addChild(femaleContainer);

    const svgsToLoad: SvgsToLoad = [];
    if (this.gender === 'male') {
      const symbol = MALE_SYMBOL;
      this.#initializeContainersAndGetSvgsToLoad(
        svgsToLoad,
        maleContainer,
        symbol.parts,
        symbol.frames?.[0],
      );
    } else {
      const symbol = FEMALE_SYMBOL;
      this.#initializeContainersAndGetSvgsToLoad(
        svgsToLoad,
        femaleContainer,
        symbol.parts,
        symbol.frames?.[0],
      );
    }

    this.#loadSvgs(svgsToLoad);

    if (this.#looking === 'right') {
      this.container.scale.x = -1;
    }

    this.#usedSvgs = {};
    if (this.gender === 'male') {
      this.#displayFrame(maleContainer, MALE_SYMBOL);
    } else {
      this.#displayFrame(femaleContainer, FEMALE_SYMBOL);
    }
  }

  updateBrute(
    gender: BruteGender,
    colors: Colors,
    parts: Record<BruteBodyPart, number>,
  ) {
    this.gender = gender;
    this.#colors = colors;
    this.#parts = parts;

    this.svgs.forEach((svg) => {
      if (!svg.destroyed) svg.destroy();
    });
    this.svgs = [];
    this.container.children.forEach((child) => {
      if (!child.destroyed) child.destroy({ children: true });
    });

    this.#initialize();
  }

  #initializeContainersAndGetSvgsToLoad = (
    svgsToLoad: SvgsToLoad,
    symbolContainer: PIXI.Container,
    parts: LaBruteSymbol['parts'],
    frame: FramePart[] = [],
  ) => {
    frame.forEach((framePart, i) => {
      const symbol = parts?.find((p) => p.name === framePart.name);

      if (!symbol) {
        throw new Error(`Part ${framePart.name} not found in symbol ${symbolContainer.name}`);
      }

      if (symbol.type === 'svg') {
        const existingSvg = svgsToLoad.find((s) => s.svg.name === symbol.name);
        if (existingSvg) {
          existingSvg.count++;
        } else {
          svgsToLoad.push({ svg: symbol, count: 1 });
        }
      } else {
        const container = new PIXI.Container();
        container.sortableChildren = true;
        container.name = symbol.name;
        container.visible = false;
        container.zIndex = frame.length - i;

        symbolContainer.addChild(container);

        let framesToLoad: number[] = [];

        if (symbol.partIdx) {
          const partValue = this.#parts[symbol.partIdx.substring(1) as BruteBodyPart];
          if (partValue === undefined) {
            throw new Error(`Part ${symbol.partIdx} not found in fighter config`);
          }
          // Clamp defensivo: si el body string trae un índice fuera del rango
          // de frames del symbol, caer to frame 0 en lugar de no renderizar
          // (lo que dejaría huecos visibles en el bruto).
          const numFrames = symbol.frames?.length ?? 0;
          framesToLoad = [partValue < numFrames ? partValue : 0];
        } else {
          framesToLoad = [0];
        }

        for (const frameIdx of framesToLoad) {
          const currentFrame = symbol.frames?.[frameIdx];
          if (!currentFrame) continue;
          this.#initializeContainersAndGetSvgsToLoad(
            svgsToLoad,
            container,
            symbol.parts,
            currentFrame,
          );
        }
      }
    });
  };

  #loadSvgs = (svgsToLoad: SvgsToLoad) => {
    for (const svgToLoad of svgsToLoad) {
      const { svg } = svgToLoad;

      for (let i = 0; i < svgToLoad.count; i++) {
        const customScale = svg.scale ?? 1;

        const svgSprite = new PIXI.Sprite(
          Texture.from(svg.svg, { resourceOptions: { scale: this.#scale * customScale } }),
        );
        svgSprite.name = svg.name;
        svgSprite.scale.set(1 / customScale);
        svgSprite.visible = false;

        if (svg.offset) {
          svgSprite.x = -(svg.offset.x ?? 0) * this.#scale;
          svgSprite.y = -(svg.offset.y ?? 0) * this.#scale;
        }

        if (!svgSprite.texture.valid) {
          this.#pendingSvgs++;
          svgSprite.texture.baseTexture.once('loaded', () => {
            this.#pendingSvgs--;
            if (this.#pendingSvgs <= 0) {
              if (this.#onLoad) this.#onLoad();
            }
          });
        }

        this.container.addChild(svgSprite);
        this.svgs.push(svgSprite);
      }
    }

    if (this.#pendingSvgs === 0) {
      if (this.#onLoad) this.#onLoad();
    }
  };

  #displayFrame = (
    symbolContainer: PIXI.Container,
    symbol: LaBruteSymbol | Svg,
    colorIdx?: string,
    zIndex?: number,
  ) => {
    if (symbol.type === 'svg') {
      const sprite = this.svgs.filter((s) => s.name === symbol.name)[
        this.#usedSvgs[symbol.name] ?? 0
      ];

      if (!sprite) {
        throw new Error(`Sprite ${symbol.name} not found`);
      }

      if (symbol.name === 'Symbol45') {
        sprite.visible = false;
        return;
      }

      sprite.visible = true;

      if (colorIdx) {
        const color = this.#colors[colorIdx.substring(1) as keyof Colors];
        if (!color) throw new Error(`Color ${colorIdx} not found`);
        sprite.tint = parseInt(color.replace('#', ''), 16);
      }

      sprite.zIndex = zIndex ?? 0;
      symbolContainer.addChild(sprite);

      this.#usedSvgs[symbol.name] = (this.#usedSvgs[symbol.name] ?? 0) + 1;
    } else {
      const usedSymbols: string[] = [];

      let frameToLoad: number;
      if (symbol.partIdx) {
        const partValue = this.#parts[symbol.partIdx.substring(1) as BruteBodyPart];
        if (partValue === undefined) {
          throw new Error(`Part ${symbol.partIdx} not found in fighter config`);
        }
        const numFrames = symbol.frames?.length ?? 0;
        frameToLoad = partValue < numFrames ? partValue : 0;
      } else {
        frameToLoad = 0;
      }

      const frameParts = symbol.frames?.[frameToLoad] ?? [];
      const usedContainers: Record<string, number> = {};

      for (let i = 0; i < frameParts.length; i++) {
        const framePart = frameParts[i];
        if (!framePart) {
          throw new Error(`Part not found in symbol ${symbol.name}`);
        }

        const identicSymbolsCount = usedSymbols.filter((s) => s === framePart.name).length;

        const framePartSymbol = symbol.parts?.filter((p) => p.name === framePart.name)[
          identicSymbolsCount
        ];

        if (!framePartSymbol) {
          throw new Error(`Part ${framePart.name} not found in symbol ${symbol.name}`);
        }

        if (framePartSymbol.type === 'svg') {
          this.#displayFrame(symbolContainer, framePartSymbol, colorIdx, frameParts.length - i);
          continue;
        }

        const framePartContainer = symbolContainer.children.filter(
          (child) => child instanceof PIXI.Container && child.name === framePart.name,
        )[usedContainers[framePart.name] ?? 0] as PIXI.Container | undefined;

        if (!framePartContainer) {
          throw new Error(`Container ${framePart.name} not found`);
        }

        if (framePart.transform) {
          framePartContainer.transform.setFromMatrix(
            matrixFromObject(framePart.transform, this.#scale),
          );
        }

        if (framePart.colorOffset) {
          framePartContainer.filters = [
            new Filter(undefined, ColorOffsetShader, {
              offset: new Float32Array([
                framePart.colorOffset.r ?? 0,
                framePart.colorOffset.g ?? 0,
                framePart.colorOffset.b ?? 0,
              ]),
              mult: new Float32Array([1, 1, 1]),
            }),
          ];
        }

        if (framePart.alpha) {
          framePartContainer.alpha = framePart.alpha;
        }

        if (framePart.maskedBy) {
          const maskSprite = this.svgs.find((svg) => svg.name === `Symbol${framePart.maskedBy}`);
          if (!maskSprite) {
            throw new Error(`Mask sprite Symbol${framePart.maskedBy} not found`);
          }
          framePartContainer.addChild(maskSprite);
          framePartContainer.mask = maskSprite;
        }

        framePartContainer.visible = true;
        usedContainers[framePart.name] = (usedContainers[framePart.name] ?? 0) + 1;

        this.#displayFrame(
          framePartContainer,
          framePartSymbol,
          framePartSymbol.colorIdx ?? colorIdx,
        );
      }
    }
  };

  onLoad = (callback: () => void) => {
    if (this.#pendingSvgs === 0) {
      callback();
      return;
    }
    this.#onLoad = callback;
  };

  destroy = () => {
    this.svgs.forEach((svg) => {
      if (!svg.destroyed) svg.destroy();
    });
    this.svgs = [];
    this.container.destroy({ children: true });
  };
}
