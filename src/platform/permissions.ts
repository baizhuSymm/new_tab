import { isExtension } from "./chrome-storage";
export const weatherOrigins = [
  "https://api.open-meteo.com/*",
  "https://geocoding-api.open-meteo.com/*",
];
export async function hasWeatherAccess() {
  return (
    !isExtension() || chrome.permissions.contains({ origins: weatherOrigins })
  );
}
export async function requestWeatherAccess() {
  return (
    !isExtension() || chrome.permissions.request({ origins: weatherOrigins })
  );
}
export async function removeWeatherAccess() {
  if (isExtension())
    await chrome.permissions.remove({ origins: weatherOrigins });
}
