#!/usr/bin/env bun
/**
 * MCP Server untuk backend POS.
 *
 * Menyediakan akses baca ke:
 *   - Skema Prisma (model, enum, relasi)
 *   - Dokumentasi API (docs/API.md)
 *   - Daftar endpoint server (src/server/*.ts)
 *   - Environment variables yang dibutuhkan
 *   - Struktur database (tabel, kolom, indeks)
 *
 * Dijalankan oleh pos_mobile via opencode.json:
 *   bun run E:/code/pos/mcp-server.ts
 *
 * Protokol: MCP over stdio (JSON-RPC 2.0)
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

// Dijalankan dengan Bun (shebang di atas) → `import.meta.dirname` selalu ada.
const ROOT = import.meta.dirname
const PRISMA_SCHEMA = join(ROOT, 'prisma', 'schema.prisma')
const API_DOCS = join(ROOT, 'docs', 'API.md')
const SERVER_DIR = join(ROOT, 'src', 'server')
const ENV_EXAMPLE = join(ROOT, '.env.example')

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

function send(id: number | string | null, result: unknown): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result })
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`,
  )
}

function sendError(
  id: number | string | null,
  code: number,
  message: string,
): void {
  const msg = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  })
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`,
  )
}

function readFileText(path: string): string {
  if (!existsSync(path)) return `[File tidak ditemukan: ${path}]`
  return readFileSync(path, 'utf-8')
}

function listServerFiles(): string[] {
  if (!existsSync(SERVER_DIR)) return []
  return readdirSync(SERVER_DIR)
    .filter((f) => f.endsWith('.ts'))
    .sort()
}

function extractEndpoints(filename: string): string {
  const filepath = join(SERVER_DIR, filename)
  const content = readFileText(filepath)
  const lines = content.split('\n')
  const signatures: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (
      line.includes('export async function') ||
      line.includes('export function') ||
      line.includes('createServerFn')
    ) {
      signatures.push(`L${i + 1}: ${line.trim()}`)
    }
  }

  return signatures.length > 0
    ? signatures.join('\n')
    : '[Tidak ada fungsi ekspor ditemukan]'
}

function parsePrismaModels(): string {
  const schema = readFileText(PRISMA_SCHEMA)
  const models: string[] = []
  const enums: string[] = []

  const modelRegex = /^model\s+(\w+)\s*\{/gm
  let match: RegExpExecArray | null
  while ((match = modelRegex.exec(schema)) !== null) {
    models.push(match[1])
  }

  const enumRegex = /^enum\s+(\w+)\s*\{/gm
  while ((match = enumRegex.exec(schema)) !== null) {
    enums.push(match[1])
  }

  return [
    `Model (${models.length}): ${models.join(', ')}`,
    `Enum (${enums.length}): ${enums.join(', ')}`,
  ].join('\n')
}

const TOOLS = [
  {
    name: 'pos_schema',
    description:
      'Baca seluruh skema Prisma (model, enum, relasi, indeks). Gunakan untuk memahami struktur database POS.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'pos_schema_summary',
    description:
      'Ringkasan singkat: daftar nama model dan enum tanpa detail field.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'pos_api_docs',
    description:
      'Baca dokumentasi API POS (docs/API.md). Kontrak data antara mobile dan backend.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'pos_server_files',
    description: 'Daftar semua file di src/server/ beserta fungsi ekspornya.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'pos_server_file',
    description: 'Baca isi lengkap satu file server.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filename: {
          type: 'string',
          description: 'Nama file di src/server/ (mis. "auth.ts", "kasir.ts").',
        },
      },
      required: ['filename'],
    },
  },
  {
    name: 'pos_env',
    description:
      'Baca .env.example — environment variables yang dibutuhkan backend.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'pos_project_info',
    description:
      'Informasi proyek: package.json, tsconfig, vercel.json, dan struktur folder.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
]

function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): { content: Array<{ type: string; text: string }> } {
  let text: string

  switch (name) {
    case 'pos_schema':
      text = readFileText(PRISMA_SCHEMA)
      break
    case 'pos_schema_summary':
      text = parsePrismaModels()
      break
    case 'pos_api_docs':
      text = readFileText(API_DOCS)
      break
    case 'pos_server_files': {
      const files = listServerFiles()
      const details = files.map((f) => `## ${f}\n${extractEndpoints(f)}`)
      text = details.join('\n\n')
      break
    }
    case 'pos_server_file': {
      const filename = String(args.filename ?? '')
      if (!filename || filename.includes('..') || filename.includes('/')) {
        text = '[Nama file tidak valid]'
      } else {
        text = readFileText(join(SERVER_DIR, filename))
      }
      break
    }
    case 'pos_env':
      text = readFileText(ENV_EXAMPLE)
      break
    case 'pos_project_info': {
      const pkg = readFileText(join(ROOT, 'package.json'))
      const tsconfig = readFileText(join(ROOT, 'tsconfig.json'))
      const vercel = existsSync(join(ROOT, 'vercel.json'))
        ? readFileText(join(ROOT, 'vercel.json'))
        : '[Tidak ada vercel.json]'
      text = [
        '## package.json',
        pkg,
        '## tsconfig.json',
        tsconfig,
        '## vercel.json',
        vercel,
      ].join('\n\n')
      break
    }
    default:
      text = `[Tool tidak dikenal: ${name}]`
  }

  return { content: [{ type: 'text', text }] }
}

function handleRequest(req: JsonRpcRequest): void {
  switch (req.method) {
    case 'initialize':
      send(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'pos-backend',
          version: '1.0.0',
        },
      })
      break

    case 'notifications/initialized':
      break

    case 'tools/list':
      send(req.id, { tools: TOOLS })
      break

    case 'tools/call': {
      const params = req.params as {
        name: string
        arguments?: Record<string, unknown>
      }
      const result = handleToolCall(params.name, params.arguments ?? {})
      send(req.id, result)
      break
    }

    default:
      sendError(req.id, -32601, `Method tidak dikenal: ${req.method}`)
  }
}

// ─── Baca JSON-RPC via stdin (MCP over stdio) ───

let buffer = ''

const rl = createInterface({ input: process.stdin })
rl.on('line', (line) => {
  buffer += line

  if (line.trim() === '') {
    return
  }

  try {
    const parsed = JSON.parse(buffer.trim()) as JsonRpcRequest
    buffer = ''
    handleRequest(parsed)
  } catch {
    // Belum lengkap, tunggu baris berikutnya
  }
})

process.stderr.write('[pos-backend MCP] Server siap.\n')
