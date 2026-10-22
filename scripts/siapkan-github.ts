import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Item = {
  id: string
  title: string
  body: string
  labels: string[]
}

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name)
  return i === -1 ? undefined : process.argv[i + 1]
}

const dryRun = process.argv.includes('--dry-run')
const configOnly = process.argv.includes('--config-only')
const project = arg('--project')
const owner = arg('--owner') ?? '@me'

function labelUntuk(id: string): string[] {
  if (id.startsWith('PRN-SEC')) {
    return ['type:security', 'area:printer', 'priority:P1']
  }
  if (id.startsWith('PRN-PERF')) {
    return ['type:chore', 'area:printer', 'priority:P2']
  }
  if (id.startsWith('PRN-FEAT')) {
    return ['type:feature', 'area:printer', 'priority:P2']
  }
  if (id.startsWith('PRN-QA')) {
    return ['type:chore', 'area:printer', 'priority:P1']
  }
  if (id === 'CICD-01' || id === 'CICD-02') {
    return ['type:chore', 'area:ci', 'priority:P1']
  }
  if (id === 'CICD-16') {
    return ['type:security', 'area:ci', 'priority:P1']
  }
  return ['type:chore', 'area:ci', 'priority:P2']
}

function bacaItem(): Item[] {
  const lines = readFileSync(resolve('docs/DAFTAR-TUGAS.md'), 'utf8').split(
    /\r?\n/,
  )
  const hasil: Item[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const cocok = lines[i]?.match(
      /^- \[ \] \*\*((?:PRN|CICD)-[A-Z]+-\d+|CICD-\d+)\*\*\s*(.*)$/,
    )
    if (!cocok) continue
    const id = cocok[1]
    const judulAwal = cocok[2]
    const isi = [lines[i] ?? '']
    while (/^\s{2,}\S/.test(lines[i + 1] ?? '')) {
      i += 1
      isi.push(lines[i] ?? '')
    }
    const judul = `${id}: ${judulAwal
      .replace(/[`*]/g, '')
      .replace(/[:.]+$/, '')
      .trim()}`.slice(0, 120)
    hasil.push({
      id,
      title: judul,
      body: `${isi.join('\n').trim()}\n\nSumber: \`docs/DAFTAR-TUGAS.md\` (${id}).`,
      labels: labelUntuk(id),
    })
  }
  return hasil
}

function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim()
}

if (!dryRun) {
  const repo = gh([
    'repo',
    'view',
    '--json',
    'nameWithOwner',
    '--jq',
    '.nameWithOwner',
  ])
  const path = resolve('.github/ISSUE_TEMPLATE/config.yml')
  writeFileSync(
    path,
    readFileSync(path, 'utf8').replaceAll(
      'https://github.com/OWNER/REPO/security/advisories/new',
      `https://github.com/${repo}/security/advisories/new`,
    ),
  )
  console.log(`config issue diarahkan ke ${repo}`)
  if (configOnly) process.exit(0)
}

const item = bacaItem()
const judulAda = new Set<string>()
if (!dryRun) {
  const daftar = JSON.parse(
    gh([
      'issue',
      'list',
      '--state',
      'all',
      '--limit',
      '1000',
      '--json',
      'title',
    ]),
  ) as Array<{ title: string }>
  for (const issue of daftar) judulAda.add(issue.title)
}

let dibuat = 0
for (const issue of item) {
  if (judulAda.has(issue.title)) {
    console.log(`lewati (sudah ada): ${issue.title}`)
    continue
  }
  if (dryRun) {
    console.log(`[dry-run] ${issue.title} [${issue.labels.join(', ')}]`)
    continue
  }
  const url = gh([
    'issue',
    'create',
    '--title',
    issue.title,
    '--body',
    issue.body,
    '--label',
    issue.labels.join(','),
  ])
  dibuat += 1
  console.log(`dibuat: ${url}`)
  if (project) {
    gh(['project', 'item-add', project, '--owner', owner, '--url', url])
    console.log(`  ditambahkan ke project ${project}`)
  }
}

console.log(
  `${dryRun ? 'kandidat' : 'dibuat'}: ${dryRun ? item.length : dibuat} issue`,
)
