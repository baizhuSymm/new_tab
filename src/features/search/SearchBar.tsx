import { useRef, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { SearchEngine, Shortcut } from "../../domain/types";
import { IconButton } from "../../ui/IconButton";
import { matchShortcuts, resolveSearch } from "./resolveSearch";
import styles from "./search.module.css";
export function SearchBar({
  onOpen,
}: {
  onOpen: (
    site: Pick<Shortcut, "name" | "url" | "icon">,
    record?: boolean,
  ) => void;
}) {
  const { snapshot, repository, run } = useAppData();
  const [text, setText] = useState(""),
    [focused, setFocused] = useState(false),
    [active, setActive] = useState(-1),
    [error, setError] = useState("");
  const composing = useRef(false),
    input = useRef<HTMLInputElement>(null);
  const matches = focused ? matchShortcuts(text, snapshot.shortcuts) : [];
  function submit() {
    const result = resolveSearch(text, snapshot.settings.searchEngine);
    if (result) {
      onOpen({ name: text.trim(), url: result.url, icon: "" }, false);
      setFocused(false);
    } else if (text.trim()) setError("只支持网页地址和普通搜索");
  }
  return (
    <div className={styles.wrap}>
      <form
        className={styles.bar}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (!composing.current) submit();
        }}
      >
        <Search size={25} strokeWidth={1.6} />
        <input
          ref={input}
          aria-label="搜索或输入网址"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls="site-matches"
          aria-activedescendant={active >= 0 ? `match-${active}` : undefined}
          placeholder="搜索，或打开一个网站"
          value={text}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setText(e.target.value);
            setActive(-1);
            setError("");
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(e) => {
            if (
              e.nativeEvent.isComposing ||
              composing.current ||
              e.keyCode === 229
            ) {
              if (e.key === "Enter") e.preventDefault();
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, matches.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, -1));
            }
            if (e.key === "Escape") {
              setFocused(false);
              setActive(-1);
            }
            if (e.key === "Enter" && active >= 0 && matches[active]) {
              e.preventDefault();
              onOpen(matches[active]);
            }
          }}
        />
        {text && (
          <IconButton
            label="清空搜索"
            onClick={() => {
              setText("");
              input.current?.focus();
            }}
          >
            <X size={18} />
          </IconButton>
        )}
        <select
          aria-label="搜索引擎"
          value={snapshot.settings.searchEngine}
          onChange={(e) =>
            void run(() =>
              repository.saveSettings({
                searchEngine: e.target.value as SearchEngine,
              }),
            )
          }
        >
          <option value="bing">必应</option>
          <option value="baidu">百度</option>
          <option value="google">Google</option>
        </select>
        <button
          className={styles.submit}
          type="submit"
          aria-label="开始搜索"
          title="开始搜索"
        >
          <ArrowUpRight size={19} />
        </button>
      </form>
      {matches.length > 0 && (
        <div className={styles.matches} role="listbox" id="site-matches">
          {matches.map((site, index) => (
            <button
              type="button"
              id={`match-${index}`}
              role="option"
              aria-selected={active === index}
              key={site.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onOpen(site)}
            >
              <span>{site.name}</span>
              <small>{new URL(site.url).hostname}</small>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
