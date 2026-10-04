import { useAppData } from "../../app/AppProvider";
import type { Settings } from "../../domain/types";
import { Dialog } from "../../ui/Dialog";
export function SettingsPanel({
  onClose,
  onLayout,
  onWallpaper,
  onWeather,
}: {
  onClose: () => void;
  onLayout: () => void;
  onWallpaper: () => void;
  onWeather: () => void;
}) {
  const { snapshot, repository, run } = useAppData(),
    settings = snapshot.settings;
  const save = (patch: Partial<Settings>) =>
    void run(() => repository.saveSettings(patch));
  return (
    <Dialog title="设置" onClose={onClose} side>
      <div className="form">
        <label>
          默认搜索引擎
          <select
            value={settings.searchEngine}
            onChange={(e) =>
              save({ searchEngine: e.target.value as Settings["searchEngine"] })
            }
          >
            <option value="bing">必应</option>
            <option value="baidu">百度</option>
            <option value="google">Google</option>
          </select>
        </label>
        <label>
          网站打开方式
          <select
            value={settings.openTarget}
            onChange={(e) =>
              save({ openTarget: e.target.value as Settings["openTarget"] })
            }
          >
            <option value="current">当前标签页</option>
            <option value="new">新标签页</option>
          </select>
        </label>
        <label>
          时间格式
          <select
            value={settings.hourFormat}
            onChange={(e) =>
              save({ hourFormat: e.target.value as Settings["hourFormat"] })
            }
          >
            <option value="24">24 小时制</option>
            <option value="12">12 小时制</option>
          </select>
        </label>
        <label>
          外观主题
          <select aria-label="外观主题" value={settings.theme} onChange={(e) => save({ theme: e.target.value as Settings["theme"] })}>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <hr className="divider" />
        <div className="form-row">
          <button onClick={onWeather}>天气城市</button>
          <button onClick={onWallpaper}>更换壁纸</button>
          <button onClick={onLayout}>编辑布局</button>
        </div>
        <hr className="divider" />
        <small>拾页 0.1.0 · 数据仅保存在此浏览器中</small>
      </div>
    </Dialog>
  );
}
