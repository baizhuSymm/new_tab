import { useState } from "react";
import { Upload, Image as ImageIcon, Check } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import { Dialog } from "../../ui/Dialog";
import { prepareWallpaper } from "./prepareWallpaper";
import styles from "./wallpaper.module.css";
export function WallpaperPanel({ onClose }: { onClose: () => void }) {
  const { snapshot, repository, run } = useAppData();
  const [wallpaper, setWallpaper] = useState(snapshot.settings.wallpaper),
    [x, setX] = useState(snapshot.settings.positionX),
    [y, setY] = useState(snapshot.settings.positionY),
    [asset, setAsset] = useState(snapshot.wallpaper),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const source =
    wallpaper === "custom" && asset
      ? asset.dataUrl
      : "./wallpapers/city-panorama.png";
  async function apply() {
    setBusy(true);
    const next =
      wallpaper === "custom" && asset
        ? { ...asset, positionX: x, positionY: y }
        : null;
    const ok = await run(() =>
      repository.applyWallpaper(next, {
        wallpaper,
        positionX: x,
        positionY: y,
      }),
    );
    setBusy(false);
    if (ok) onClose();
    else setError("壁纸保存失败，请重试");
  }
  return (
    <Dialog title="壁纸" onClose={onClose} wide side>
      <div className="form">
        <img
          className={styles.preview}
          src={source}
          style={{ objectPosition: `${x}% ${y}%` }}
          alt="壁纸裁切预览"
        />
        <div className={styles.choices}>
          <button
            aria-pressed={wallpaper === "city"}
            onClick={() => {
              setWallpaper("city");
              setX(50);
              setY(50);
            }}
          >
            <ImageIcon size={17} />
            城市晨光{wallpaper === "city" && <Check size={15} />}
          </button>
          {asset && (
            <button
              aria-pressed={wallpaper === "custom"}
              onClick={() => setWallpaper("custom")}
            >
              <ImageIcon size={17} />
              本地图片{wallpaper === "custom" && <Check size={15} />}
            </button>
          )}
          <label className={styles.upload}>
            <Upload size={17} />
            上传图片
            <input
              aria-label="上传壁纸"
              disabled={busy}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  const next = await prepareWallpaper(file);
                  setAsset(next);
                  setWallpaper("custom");
                  setX(50);
                  setY(50);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "图片处理失败");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
        </div>
        <label>
          水平位置
          <input
            type="range"
            min={0}
            max={100}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
          />
        </label>
        <label>
          垂直位置
          <input
            type="range"
            min={0}
            max={100}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
          />
        </label>
        {busy && <p role="status">正在处理图片…</p>}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button onClick={onClose}>取消</button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void apply()}
          >
            应用壁纸
          </button>
        </div>
      </div>
    </Dialog>
  );
}
