import { dirname, resolve } from "node:path";
import { stat, readdir } from "@toonflow/file";
import conf from "@/utils/conf";

export const zImageRoot = () => resolve(dirname(conf.path), "localModels/zImage");
export async function zImageStatus() {
  const root = zImageRoot();
  const binary = resolve(root, "env/bin/mflux-generate-z-image-turbo");
  const installed = process.platform === "darwin" && await stat(binary).then((value) => value.isFile()).catch(() => false);
  const snapshots = resolve(root, "cache/hub/models--filipstrand--Z-Image-Turbo-mflux-4bit/snapshots");
  const versions = await readdir(snapshots).catch(() => [] as string[]);
  let modelReady = false;
  for (const version of versions) {
    if (!/^[a-f0-9]{40}$/.test(version)) continue;
    const files = ["text_encoder/0.safetensors", "text_encoder/1.safetensors", "transformer/0.safetensors", "transformer/1.safetensors", "vae/0.safetensors", "tokenizer/tokenizer.json"];
    const found = await Promise.all(files.map((path) => stat(resolve(snapshots, version, path)).then((value) => value.isFile() && value.size > 0).catch(() => false)));
    if (found.every(Boolean)) { modelReady = true; break; }
  }
  return { installed, modelReady, binary, root };
}
