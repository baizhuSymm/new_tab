import { describe, expect, test } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "../src/app/App";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { AppDataContext } from "../src/app/AppProvider";
import { createRepository, type Repository } from "../src/data/repository";
import type { AppSnapshot } from "../src/domain/types";
import { memoryAdapter } from "./fixtures";
import { SchedulePanel } from "../src/features/schedule/SchedulePanel";

function ScheduleHost({ snapshot, repository, children }: { snapshot: AppSnapshot; repository: Repository; children: ReactNode }) {
  const [current, setCurrent] = useState(snapshot);
  const run = async (action: () => Promise<void>) => {
    await action();
    setCurrent(await repository.load());
    return true;
  };
  return <AppDataContext.Provider value={{ snapshot: current, repository, run, error: "", clearError: () => {} }}>{children}</AppDataContext.Provider>;
}

describe("schedule panel", () => {
  test("creates appointments and retains invalid form values without calendar UI", async () => {
    const repository = createRepository(memoryAdapter());
    const snapshot = await repository.load();
    render(<ScheduleHost snapshot={snapshot} repository={repository}><SchedulePanel /></ScheduleHost>);
    await userEvent.click(within(screen.getByRole("region", { name: "日程管理" })).getAllByRole("button", { name: "添加日程" })[0]);
    await userEvent.type(screen.getByLabelText("标题"), "项目评审");
    fireEvent.change(screen.getByLabelText("开始时间"), { target: { value: "2026-10-01T09:00" } });
    fireEvent.change(screen.getByLabelText("结束时间（选填）"), { target: { value: "2026-10-01T08:00" } });
    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("结束时间须晚于开始时间");
    expect(screen.getByLabelText("标题")).toHaveValue("项目评审");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/重复|recurrence/i)).not.toBeInTheDocument();
  });

  test("shows saved appointments and all-schedules view", async () => {
    const repository = createRepository(memoryAdapter());
    const snapshot = await repository.load();
    render(<ScheduleHost snapshot={snapshot} repository={repository}><SchedulePanel /></ScheduleHost>);
    await userEvent.click(within(screen.getByRole("region", { name: "日程管理" })).getAllByRole("button", { name: "添加日程" })[0]);
    await userEvent.type(screen.getByLabelText("标题"), "项目评审");
    fireEvent.change(screen.getByLabelText("开始时间"), { target: { value: "2026-10-01T09:00" } });
    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("项目评审")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "全部日程" }));
    expect(screen.getByRole("dialog", { name: "全部日程" })).toHaveTextContent("项目评审");
  });

  test("the application shell still mounts", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "设置" });
    expect(screen.queryByRole("grid", { name: /日历|calendar/i })).not.toBeInTheDocument();
  });
});
