import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DATA = { users: {}, emailIndex: {}, sessions: {} };

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath instanceof URL ? fileURLToPath(filePath) : filePath;
    this.writeQueue = Promise.resolve();
  }

  async read() {
    try {
      const contents = await readFile(this.filePath, "utf8");
      return { ...DEFAULT_DATA, ...JSON.parse(contents) };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await this.write(DEFAULT_DATA);
      return { ...DEFAULT_DATA };
    }
  }

  async update(mutator) {
    const operation = this.writeQueue.catch(() => {}).then(async () => {
      const data = await this.read();
      const result = await mutator(data);
      await this.write(data);
      return result;
    });
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async write(data) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`);
  }
}
