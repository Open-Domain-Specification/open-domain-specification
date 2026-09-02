import "@testing-library/jest-dom/vitest";
import { installXyflowTestEnv } from "./xyflow-test-env";

// Every page carries a Svelte Flow figure, so the jsdom stand-ins apply to the whole suite.
if (typeof window !== "undefined") installXyflowTestEnv();
