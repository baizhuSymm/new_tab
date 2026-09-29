import { useEffect, useRef, useState } from "react";
import {
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { City } from "../../domain/types";
import { isExtension } from "../../platform/chrome-storage";
import {
  hasWeatherAccess,
  requestWeatherAccess,
  removeWeatherAccess,
} from "../../platform/permissions";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import {
  fetchCurrentWeather,
  freshWeather,
  searchCities,
  weatherLabel,
} from "./api";
import styles from "./weather.module.css";
export function WeatherWidget({ onConfigure }: { onConfigure: () => void }) {
  const { snapshot, repository } = useAppData();
  const [status, setStatus] = useState(""),
    [tick, setTick] = useState(0),
    [allowed, setAllowed] = useState(false);
  const cache = useRef(snapshot.weather);
  cache.current = snapshot.weather;
  const force = useRef(false);
  const city = snapshot.settings.city;
  useEffect(() => {
    const update = () => setTick((n) => n + 1);
    const timer = setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    if (isExtension()) chrome.permissions.onRemoved.addListener(update);
    if (isExtension()) chrome.permissions.onAdded.addListener(update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      if (isExtension()) chrome.permissions.onRemoved.removeListener(update);
      if (isExtension()) chrome.permissions.onAdded.removeListener(update);
    };
  }, []);
  useEffect(() => {
    if (!city) {
      setStatus("");
      return;
    }
    const controller = new AbortController();
    let active = true;
    void (async () => {
      try {
        const permission = await hasWeatherAccess();
        if (!active) return;
        setAllowed(permission);
        if (!permission) {
          setStatus("需要重新授权");
          return;
        }
        if (!force.current && freshWeather(cache.current, city.id)) {
          setStatus("");
          return;
        }
        force.current = false;
        setStatus("更新中");
        const weather = await fetchCurrentWeather(city, controller.signal);
        if (!active) return;
        await repository.saveWeather(weather);
        if (active) setStatus("");
      } catch {
        if (active) setStatus("更新失败");
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [city?.id, tick, repository]);
  const weather =
    allowed && snapshot.weather?.cityId === city?.id ? snapshot.weather : null;
  const Icon = weather
    ? weather.code === 0
      ? Sun
      : weather.code <= 3
        ? CloudSun
        : weather.code >= 71 && weather.code <= 77
          ? CloudSnow
          : weather.code >= 51
            ? CloudRain
            : Cloud
    : CloudSun;
  return (
    <div className={styles.widget}>
      <button
        className={styles.summary}
        onClick={onConfigure}
        aria-label={city ? "更换天气城市" : "设置天气城市"}
      >
        <Icon
          size={31}
          strokeWidth={1.5}
          color={weather?.code === 0 ? "#f0c66d" : "#e6eee8"}
        />
        <span>
          <strong>
            {city
              ? `${city.name} ${weather ? `${Math.round(weather.temperature)}°C` : "—"}`
              : "此刻的天气"}
          </strong>
          <small>
            {city
              ? weather
                ? `${weatherLabel(weather.code)}${status ? ` · ${status}，显示缓存` : ""}`
                : status || "正在获取"
              : "选择城市"}
          </small>
        </span>
      </button>
      {city && (
        <div className={styles.source}>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
          {weather && status && (
            <span>
              {new Date(weather.fetchedAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}{" "}
              更新
            </span>
          )}
          {status === "更新失败" && (
            <IconButton
              label="重试天气"
              onClick={() => {
                force.current = true;
                setTick((n) => n + 1);
              }}
            >
              <RefreshCw size={12} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}
export function CityPicker({ onClose }: { onClose: () => void }) {
  const { repository, run, snapshot } = useAppData();
  const [enabled, setEnabled] = useState(false),
    [query, setQuery] = useState(""),
    [cities, setCities] = useState<City[]>([]),
    [status, setStatus] = useState(""),
    [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    void hasWeatherAccess()
      .then((value) => {
        if (active) {
          setEnabled(value);
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          setChecking(false);
          setStatus("无法读取天气权限");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setCities([]);
    if (!enabled || query.trim().length < 2) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      setStatus("查找中…");
      void searchCities(query, controller.signal)
        .then((results) => {
          if (active) {
            setCities(results);
            setStatus(results.length ? "" : "没有找到匹配的城市");
          }
        })
        .catch(() => {
          if (active) setStatus("查询失败，请检查网络后重试");
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);
  return (
    <Dialog title="天气城市" onClose={onClose}>
      <div className="form">
        {!enabled && !checking && (
          <>
            <p className="muted">
              天气由 Open-Meteo 提供，仅发送城市名称或坐标。
            </p>
            <button
              className="primary"
              onClick={() => {
                void requestWeatherAccess()
                  .then((value) => {
                    setEnabled(value);
                    setStatus(value ? "" : "未获授权，天气保持关闭");
                  })
                  .catch(() => setStatus("授权失败，请重试"));
              }}
            >
              启用天气
            </button>
          </>
        )}
        {enabled && (
          <label>
            城市
            <input
              placeholder="例如：上海、北京"
              aria-label="查找城市"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        {status && (
          <p role="status" className="muted">
            {status}
          </p>
        )}
        <div className={styles.cities}>
          {cities.map((city) => (
            <button
              key={city.id}
              onClick={async () => {
                if (await run(() => repository.saveSettings({ city })))
                  onClose();
              }}
            >
              <MapPin size={18} />
              <span>
                {city.name}
                <small>
                  {city.admin1} · {city.country}
                </small>
              </span>
            </button>
          ))}
        </div>
        {snapshot.settings.city && (
          <button
            className="danger"
            onClick={async () => {
              if (
                await run(async () => {
                  await repository.saveSettings({ city: null });
                  await removeWeatherAccess();
                })
              )
                onClose();
            }}
          >
            关闭天气
          </button>
        )}
        <small>
          数据来源：
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
        </small>
      </div>
    </Dialog>
  );
}
