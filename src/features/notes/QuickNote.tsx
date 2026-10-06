import { useState } from "react";
import { ArrowUp, History, Pencil, Trash2 } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { Note } from "../../domain/types";
import { IconButton } from "../../ui/IconButton";
import { Dialog } from "../../ui/Dialog";
import type { NoteDraftState } from "./useNoteDraft";
import styles from "./notes.module.css";
export function QuickNote({
  note,
  management = false,
  onHistory,
}: {
  note: NoteDraftState;
  management?: boolean;
  onHistory?: () => void;
}) {
  return (
    <section aria-label="快速记录">
      <div className="section-heading">
        <h2>{management ? "我的便签" : "快速记录"}</h2>
        <span className="spacer" />
        {onHistory && (
          <IconButton label="便签历史" onClick={onHistory}>
            <History size={16} />
          </IconButton>
        )}
      </div>
      <div className={styles.composer}>
        <textarea
          aria-label="便签草稿"
          placeholder="随手记下想法、待办或灵感…"
          maxLength={10000}
          value={note.draft.text}
          disabled={note.busy}
          onChange={(e) => note.change(e.target.value)}
          onBlur={() => void note.flush()}
          onKeyDown={(e) => {
            if (
              (e.ctrlKey || e.metaKey) &&
              e.key === "Enter" &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void note.submit();
            }
          }}
        />
        <div className={styles.footer}>
          <small
            role="status"
            className={note.status === "保存失败" ? "field-error" : ""}
          >
            {note.status}
          </small>
          {note.status === "保存失败" && (
            <button className="small-link" onClick={() => void note.flush()}>
              重试
            </button>
          )}
          <IconButton
            label="保存为便签"
            disabled={
              note.busy || !note.draft.text.trim() || Boolean(note.conflict)
            }
            onClick={() => void note.submit()}
          >
            <ArrowUp size={18} />
          </IconButton>
        </div>
      </div>
      {note.conflict && (
        <div className="notice">
          另一个标签页更新了草稿。
          <div className="form-row">
            <button
              disabled={note.busy}
              onClick={() => void note.resolve(true)}
            >
              保留本地
            </button>
            <button
              disabled={note.busy}
              onClick={() => void note.resolve(false)}
            >
              载入已保存内容
            </button>
          </div>
        </div>
      )}
      {!management && <RecentNotes onOpen={onHistory} />}
      {management && <NoteList />}
    </section>
  );
}
function RecentNotes({ onOpen }: { onOpen?: () => void }) {
  const { snapshot } = useAppData();
  const recent = snapshot.notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
    .slice(0, 3);
  if (!recent.length) return null;
  return (
    <div className={styles.recentList} aria-label="最近便签">
      {recent.map((entry) => (
        <button key={entry.id} type="button" onClick={onOpen} className={styles.recentNote}>
          <span>{entry.text}</span>
          <time dateTime={new Date(entry.updatedAt).toISOString()}>
            {new Date(entry.updatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
          </time>
        </button>
      ))}
    </div>
  );
}
function NoteList() {
  const { snapshot, repository, run } = useAppData();
  const [editing, setEditing] = useState<Note | null>(null),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  return (
    <>
      <div className={styles.list}>
        {[...snapshot.notes]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((note) => (
            <article className={styles.note} key={note.id}>
              <p>{note.text}</p>
              <footer>
                <small>
                  {new Date(note.updatedAt).toLocaleString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </small>
                <IconButton
                  label="编辑便签"
                  onClick={() => {
                    setEditing(note);
                    setText(note.text);
                    setError("");
                  }}
                >
                  <Pencil size={15} />
                </IconButton>
                <IconButton
                  label="删除便签"
                  onClick={() => {
                    if (confirm("删除这条便签？"))
                      void run(() => repository.remove("note", note.id));
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </footer>
            </article>
          ))}
      </div>
      {!snapshot.notes.length && <p className="empty">还没有保存的便签</p>}
      {editing && (
        <Dialog title="编辑便签" onClose={() => setEditing(null)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!text.trim()) return;
              if (
                await run(() =>
                  repository.save("note", {
                    ...editing,
                    text: text.trim(),
                    updatedAt: Date.now(),
                  }),
                )
              )
                setEditing(null);
              else setError("保存失败，内容已保留");
            }}
          >
            <textarea
              aria-label="便签正文"
              maxLength={10000}
              rows={8}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <button className="primary">保存</button>
          </form>
        </Dialog>
      )}
    </>
  );
}
