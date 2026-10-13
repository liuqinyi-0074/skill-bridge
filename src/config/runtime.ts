import { resolveEnvironment } from "./environment";
export const APP_CONFIG = resolveEnvironment(import.meta.env);
