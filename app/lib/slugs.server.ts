import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import type { Config } from "unique-names-generator";

const config: Config = {
  dictionaries: [adjectives, colors, animals],
  length: 3,
  separator: "_",
};

export function generateSlug(): string {
  return uniqueNamesGenerator(config);
}
