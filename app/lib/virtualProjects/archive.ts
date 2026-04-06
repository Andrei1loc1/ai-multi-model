import type { VirtualProject } from "@/app/lib/workspaces/types";
import { deflateRawSync } from "zlib";

type ZipEntry = {
    name: string;
    data: Buffer;
    crc32: number;
    compressedData: Buffer;
    offset: number;
};

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let bit = 0; bit < 8; bit++) {
        crc = (crc & 1) !== 0 ? (0xedb88320 ^ (crc >>> 1)) >>> 0 : crc >>> 1;
    }
    CRC32_TABLE[i] = crc >>> 0;
}

function crc32(buffer: Buffer) {
    let crc = 0xffffffff;
    for (let index = 0; index < buffer.length; index++) {
        crc = CRC32_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function toSafeArchivePath(path: string) {
    const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "").trim();
    const segments = normalized.split("/").filter((segment) => segment && segment !== "." && segment !== "..");
    return segments.join("/");
}

function toZipDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    return { dosDate, dosTime };
}

function createLocalFileHeader(entry: ZipEntry) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const { dosDate, dosTime } = toZipDateTime();
    const header = Buffer.alloc(30 + nameBytes.length);

    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(entry.crc32, 14);
    header.writeUInt32LE(entry.compressedData.length, 18);
    header.writeUInt32LE(entry.data.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    header.writeUInt16LE(0, 28);
    nameBytes.copy(header, 30);

    return header;
}

function createCentralDirectoryHeader(entry: ZipEntry) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const { dosDate, dosTime } = toZipDateTime();
    const header = Buffer.alloc(46 + nameBytes.length);

    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(dosTime, 12);
    header.writeUInt16LE(dosDate, 14);
    header.writeUInt32LE(entry.crc32, 16);
    header.writeUInt32LE(entry.compressedData.length, 20);
    header.writeUInt32LE(entry.data.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(entry.offset, 42);
    nameBytes.copy(header, 46);

    return header;
}

function createEndOfCentralDirectory(entries: ZipEntry[], centralDirectorySize: number, centralDirectoryOffset: number) {
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralDirectorySize, 12);
    eocd.writeUInt32LE(centralDirectoryOffset, 16);
    eocd.writeUInt16LE(0, 20);
    return eocd;
}

export function buildVirtualProjectArchive(project: VirtualProject) {
    const entries: ZipEntry[] = [];
    const fileParts: Buffer[] = [];
    let offset = 0;

    const sortedFiles = [...project.files].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.path.localeCompare(b.path);
    });

    for (const file of sortedFiles) {
        const safePath = toSafeArchivePath(file.path);
        if (!safePath) {
            continue;
        }

        const data = Buffer.from(file.content, "utf8");
        const compressedData = deflateRawSync(data, { level: 9 });
        const entry: ZipEntry = {
            name: safePath,
            data,
            crc32: crc32(data),
            compressedData,
            offset,
        };

        const localHeader = createLocalFileHeader(entry);
        fileParts.push(localHeader, compressedData);
        offset += localHeader.length + compressedData.length;
        entries.push(entry);
    }

    const centralDirectoryParts: Buffer[] = [];
    let centralDirectorySize = 0;

    for (const entry of entries) {
        const centralHeader = createCentralDirectoryHeader(entry);
        centralDirectoryParts.push(centralHeader);
        centralDirectorySize += centralHeader.length;
    }

    const centralDirectoryOffset = offset;
    const eocd = createEndOfCentralDirectory(entries, centralDirectorySize, centralDirectoryOffset);

    return Buffer.concat([...fileParts, ...centralDirectoryParts, eocd]);
}

export function buildVirtualProjectArchiveFilename(project: VirtualProject) {
    const baseName = project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);

    return `${baseName || project.kind || "virtual-project"}.zip`;
}
