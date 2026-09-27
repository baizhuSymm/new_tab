import { test, expect, vi, afterEach } from "vitest";
import {
  hasWeatherAccess,
  requestWeatherAccess,
  weatherOrigins,
} from "../src/platform/permissions";
afterEach(() => vi.unstubAllGlobals());
test("permission checks never request access and explicit enable requests only weather origins", async () => {
  const request = vi.fn().mockResolvedValue(false),
    contains = vi.fn().mockResolvedValue(false);
  vi.stubGlobal("chrome", {
    runtime: { id: "extension-test" },
    permissions: { request, contains },
  });
  expect(await hasWeatherAccess()).toBe(false);
  expect(request).not.toHaveBeenCalled();
  expect(await requestWeatherAccess()).toBe(false);
  expect(request).toHaveBeenCalledWith({ origins: weatherOrigins });
});
