"use client";

import { FileCode2, FolderOpen } from "lucide-react";
import { useMemo } from "react";
import type { VirtualProjectFile } from "@/app/lib/workspaces/types";

type FileEntry = Pick<VirtualProjectFile, "path" | "language" | "isEntry">;

type FileTreeFolder = {
    name: string;
    path: string;
    folders: Map<string, FileTreeFolder>;
    files: FileEntry[];
};

function createFolder(name: string, path: string): FileTreeFolder {
    return {
        name,
        path,
        folders: new Map(),
        files: [],
    };
}

function buildTree(files: FileEntry[]) {
    const root = createFolder("", "");

    for (const file of files) {
        const parts = file.path.split("/").filter(Boolean);
        let current = root;
        let accumulatedPath = "";

        parts.forEach((part, index) => {
            accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
            const isLeaf = index === parts.length - 1;

            if (isLeaf) {
                current.files.push(file);
                return;
            }

            if (!current.folders.has(part)) {
                current.folders.set(part, createFolder(part, accumulatedPath));
            }

            current = current.folders.get(part) as FileTreeFolder;
        });

        if (!parts.length) {
            current.files.push(file);
        }
    }

    return root;
}

function sortFileEntries(entries: FileEntry[]) {
    return [...entries].sort((left, right) => {
        if (left.isEntry !== right.isEntry) {
            return left.isEntry ? -1 : 1;
        }

        return left.path.localeCompare(right.path);
    });
}

function VirtualFileRow({
    file,
    selected,
    depth,
    onSelect,
}: {
    file: FileEntry;
    selected: boolean;
    depth: number;
    onSelect: (path: string) => void;
}) {
    const name = file.path.split("/").pop() || file.path;

    return (
        <button
            type="button"
            onClick={() => onSelect(file.path)}
            className={`group flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                selected
                    ? "border-cyan-300/25 bg-cyan-300/[0.12] text-white shadow-[0_12px_30px_rgba(34,211,238,0.10)]"
                    : "border-white/6 bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.05]"
            }`}
            style={{ marginLeft: `${depth * 14}px` }}
        >
            <FileCode2 size={14} className={selected ? "text-cyan-100" : "text-slate-400"} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{name}</span>
                    {file.isEntry && (
                        <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.12] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-emerald-100">
                            entry
                        </span>
                    )}
                </div>
                <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {file.language}
                </div>
            </div>
        </button>
    );
}

function FolderBlock({
    folder,
    depth,
    selectedPath,
    onSelect,
}: {
    folder: FileTreeFolder;
    depth: number;
    selectedPath: string | null;
    onSelect: (path: string) => void;
}) {
    const folders = [...folder.folders.values()].sort((left, right) => left.name.localeCompare(right.name));
    const files = sortFileEntries(folder.files);

    return (
        <div className="space-y-1.5">
            {folders.map((child) => (
                <div key={child.path} className="space-y-1.5">
                    <div
                        className="flex items-center gap-2 px-1 text-[10px] uppercase tracking-[0.22em] text-slate-500"
                        style={{ marginLeft: `${depth * 14}px` }}
                    >
                        <FolderOpen size={13} className="text-slate-400" />
                        <span className="truncate">{child.name}</span>
                    </div>
                    <FolderBlock
                        folder={child}
                        depth={depth + 1}
                        selectedPath={selectedPath}
                        onSelect={onSelect}
                    />
                </div>
            ))}

            {files.map((file) => (
                <VirtualFileRow
                    key={file.path}
                    file={file}
                    selected={selectedPath === file.path}
                    depth={depth}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}

export default function VirtualFileTree({
    files,
    selectedPath,
    onSelectPath,
}: {
    files: FileEntry[];
    selectedPath: string | null;
    onSelectPath: (path: string) => void;
}) {
    const tree = useMemo(() => buildTree(files), [files]);
    const totalFiles = files.length;

    if (!totalFiles) {
        return (
            <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                No files were generated for this project.
            </div>
        );
    }

    return (
        <div className="rounded-[22px] border border-white/6 bg-white/[0.03] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Project files</div>
                    <div className="mt-1 text-sm font-medium text-white">{totalFiles} files</div>
                </div>
                <div className="rounded-full border border-white/8 bg-slate-950/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                    tree
                </div>
            </div>

            <div className="space-y-1.5">
                <FolderBlock folder={tree} depth={0} selectedPath={selectedPath} onSelect={onSelectPath} />
            </div>
        </div>
    );
}
