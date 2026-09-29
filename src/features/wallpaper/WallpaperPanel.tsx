import { useState } from "react";
import { Check, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import { builtinWallpapers, getWallpaperPosition } from "../../domain/wallpapers";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import { prepareWallpaper } from "./prepareWallpaper";
import styles from "./wallpaper.module.css";

export function WallpaperPanel({ onClose }: { onClose: () => void }) {
  const { snapshot, repository, run } = useAppData();
  const [wallpaperId, setWallpaperId] = useState(snapshot.settings.wallpaperId);
  const initialPosition = getWallpaperPosition(snapshot.settings, wallpaperId);
  const [x, setX] = useState(initialPosition.positionX);
  const [y, setY] = useState(initialPosition.positionY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedBuiltin = builtinWallpapers.find((item) => item.id === wallpaperId);
  const selectedAsset = snapshot.wallpapers.find((item) => item.id === wallpaperId);
  const source = selectedAsset?.dataUrl ?? selectedBuiltin?.src ?? builtinWallpapers[0].src;

  function select(id: string) {
    setWallpaperId(id);
    const position = getWallpaperPosition(snapshot.settings, id);
    setX(position.positionX);
    setY(position.positionY);
    setError("");
  }

  async function apply() {
    setBusy(true);
    const ok = await run(() => repository.applyWallpaperId(wallpaperId, { positionX: x, positionY: y }));
    setBusy(false);
    if (ok) onClose();
    else setError("壁纸保存失败，当前壁纸保持不变，请释放一些浏览器存储空间后重试");
  }

  return <Dialog title="壁纸" onClose={onClose} wide side>
    <div className={styles.panel}>
      <img className={styles.preview} src={source} style={{ objectPosition: `${x}% ${y}%` }} alt="壁纸裁切预览" />
      <h3>内置壁纸</h3>
      <div className={styles.gallery}>
        {builtinWallpapers.map((item) => <button key={item.id} className={styles.choice} aria-pressed={wallpaperId === item.id} onClick={() => select(item.id)}>
          <img src={item.src} alt="" />
          <span>{item.name}</span>
          {wallpaperId === item.id && <Check size={15} />}
        </button>)}
      </div>
      <div className={styles.uploadHeading}><h3>我的壁纸</h3><label className={styles.upload}><Upload size={15} />上传图片<input aria-label="上传壁纸" disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setBusy(true);
        setError("");
        try {
          const asset = await prepareWallpaper(file);
          const saved = await run(() => repository.save("wallpaper", asset));
          if (saved) select(asset.id);
          else setError("壁纸保存失败，当前壁纸保持不变；请释放一些浏览器存储空间后重试");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "图片处理失败");
        } finally { setBusy(false); }
      }} /></label></div>
      {snapshot.wallpapers.length > 0 && <div className={styles.gallery}>
        {snapshot.wallpapers.map((asset) => <div className={styles.customChoice} key={asset.id}>
          <button className={styles.choice} aria-pressed={wallpaperId === asset.id} onClick={() => select(asset.id)}>
            <img src={asset.dataUrl} alt="" /><span>自定义壁纸</span>{wallpaperId === asset.id && <Check size={15} />}
          </button>
          <IconButton label="删除自定义壁纸" disabled={busy || snapshot.settings.wallpaperId === asset.id} title={snapshot.settings.wallpaperId === asset.id ? "先应用其他壁纸再删除" : "删除壁纸"} onClick={async () => {
            if (!confirm("删除这张自定义壁纸？")) return;
            const removed = await run(() => repository.remove("wallpaper", asset.id));
            if (removed && wallpaperId === asset.id) select(snapshot.settings.wallpaperId);
          }}><Trash2 size={15} /></IconButton>
        </div>)}
      </div>}
      <div className={styles.cropControls}>
        <label>水平位置<input type="range" min={0} max={100} value={x} onChange={(event) => setX(Number(event.target.value))} /></label>
        <label>垂直位置<input type="range" min={0} max={100} value={y} onChange={(event) => setY(Number(event.target.value))} /></label>
      </div>
      {busy && <p role="status">正在处理图片…</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="form-actions"><button onClick={onClose}>取消</button><button className="primary" disabled={busy} onClick={() => void apply()}><ImageIcon size={15} />应用壁纸</button></div>
    </div>
  </Dialog>;
}
