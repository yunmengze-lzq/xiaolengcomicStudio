import { dirname, resolve } from "node:path";
import { stat, readdir } from "@toonflow/file";
import conf from "@/utils/conf";

export const zImageRoot = () => resolve(dirname(conf.path), "localModels/zImage");
export async function zImageStatus(engine: "zImage" | "fluxKlein" = "zImage") {
  const klein = engine === "fluxKlein";
  const root = klein ? resolve(dirname(conf.path), "localModels/fluxKlein") : zImageRoot();
  const binary = resolve(zImageRoot(), klein ? "env/bin/mflux-generate-flux2-edit" : "env/bin/mflux-generate-z-image-turbo");
  const textBinary = klein ? resolve(zImageRoot(), "env/bin/mflux-generate-flux2") : binary;
  const installed = process.platform === "darwin" && await stat(binary).then((value) => value.isFile()).catch(() => false);
  const model = klein ? "mlx-community/flux2-klein-4b-4bit" : "filipstrand/Z-Image-Turbo-mflux-4bit";
  const snapshots = resolve(root, `cache/hub/models--${model.replaceAll("/", "--")}/snapshots`);
  const versions = await readdir(snapshots).catch(() => [] as string[]);
  let modelReady = false;
  for (const version of versions) {
    if (!/^[a-f0-9]{40}$/.test(version)) continue;
    const files = ["text_encoder/0.safetensors", "text_encoder/1.safetensors", "transformer/0.safetensors", "transformer/1.safetensors", "vae/0.safetensors", "tokenizer/tokenizer.json", ...(klein ? ["tokenizer/chat_template.jinja", "text_encoder/model.safetensors.index.json", "transformer/model.safetensors.index.json", "vae/model.safetensors.index.json"] : [])];
    const found = await Promise.all(files.map((path) => stat(resolve(snapshots, version, path)).then((value) => value.isFile() && value.size > 0).catch(() => false)));
    if (found.every(Boolean)) { modelReady = true; break; }
  }
  return { installed, modelReady, binary, textBinary, root, model };
}
