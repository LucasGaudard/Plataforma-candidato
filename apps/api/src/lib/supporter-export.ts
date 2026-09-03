import ExcelJS from 'exceljs';
import { formatPhone, getCityZoneLabel, normalizeBrazilianPhone } from '@platform/utils';
import type { CityZone } from '@platform/types';

export type SupporterExportRow = { firstName: string; lastName: string; phone: string; city?: string; state?: string; neighborhood?: string | null; zone?: CityZone | null; leaderName?: string | null; coordinatorName?: string | null };
export type ManagedUserExportRow = SupporterExportRow & { email: string; active: boolean; supportersCount: number; leadersCount?: number };

const fullName = (row: Pick<SupporterExportRow, 'firstName' | 'lastName'>) => `${row.firstName} ${row.lastName}`.replace(/\s+/g, ' ').trim();
const phone = (value: string) => formatPhone(normalizeBrazilianPhone(value) ?? value);
const region = (value?: CityZone | null) => value ? getCityZoneLabel(value) : 'Não informada';

function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: sheet.getRow(1).getCell(sheet.columnCount).address };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28543B' } };
}

function safeSheetName(value: string, used: Set<string>) {
  const base = value.replace(/[\\/*?:[\]]/g, '-').slice(0, 31) || 'Não informada';
  let name = base;
  let suffix = 2;
  while (used.has(name)) name = `${base.slice(0, 27)} (${suffix++})`;
  used.add(name);
  return name;
}

function addSupportersSheet(workbook: ExcelJS.Workbook, name: string, rows: SupporterExportRow[], used: Set<string>) {
  const sheet = workbook.addWorksheet(safeSheetName(name, used));
  sheet.columns = [
    { header: 'Nome', key: 'name', width: 34 }, { header: 'Telefone', key: 'phone', width: 20, style: { numFmt: '@' } },
    { header: 'Região', key: 'region', width: 18 }, { header: 'Bairro', key: 'neighborhood', width: 26 },
    { header: 'Cidade', key: 'city', width: 24 }, { header: 'UF', key: 'state', width: 8 },
    { header: 'Líder', key: 'leader', width: 30 }, { header: 'Coordenador', key: 'coordinator', width: 30 },
  ];
  rows.forEach((row) => sheet.addRow({ name: fullName(row), phone: phone(row.phone), region: region(row.zone), neighborhood: row.neighborhood || 'Não informado', city: row.city || '', state: row.state || '', leader: row.leaderName || 'Sem líder', coordinator: row.coordinatorName || 'Sem coordenador' }));
  styleSheet(sheet);
}

export async function createSupportersWorkbook(rows: SupporterExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Conecta Eleitor';
  workbook.created = new Date();
  const used = new Set<string>();
  addSupportersSheet(workbook, 'Todos os apoiadores', rows, used);

  const summary = workbook.addWorksheet('Resumo');
  summary.columns = [{ header: 'Região', key: 'region', width: 20 }, { header: 'Bairro', key: 'neighborhood', width: 30 }, { header: 'Quantidade', key: 'count', width: 14 }];
  const counts = new Map<string, { region: string; neighborhood: string; count: number }>();
  rows.forEach((row) => {
    const item = { region: region(row.zone), neighborhood: row.neighborhood || 'Não informado' };
    const key = `${item.region}\0${item.neighborhood}`;
    counts.set(key, { ...item, count: (counts.get(key)?.count || 0) + 1 });
  });
  [...counts.values()].sort((a, b) => a.region.localeCompare(b.region, 'pt-BR') || a.neighborhood.localeCompare(b.neighborhood, 'pt-BR')).forEach((item) => summary.addRow(item));
  styleSheet(summary);

  const byRegion = new Map<string, SupporterExportRow[]>();
  rows.forEach((row) => byRegion.set(region(row.zone), [...(byRegion.get(region(row.zone)) || []), row]));
  [...byRegion.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).forEach(([name, items]) => {
    items.sort((a, b) => (a.neighborhood || '').localeCompare(b.neighborhood || '', 'pt-BR') || fullName(a).localeCompare(fullName(b), 'pt-BR'));
    addSupportersSheet(workbook, `Região ${name}`, items, used);
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function createManagedUsersWorkbook(kind: 'leaders' | 'coordinators', rows: ManagedUserExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Conecta Eleitor';
  const sheet = workbook.addWorksheet(kind === 'leaders' ? 'Líderes' : 'Coordenadores');
  sheet.columns = [
    { header: 'Nome', key: 'name', width: 34 }, { header: 'E-mail', key: 'email', width: 34 }, { header: 'Telefone', key: 'phone', width: 20, style: { numFmt: '@' } },
    { header: 'Status', key: 'status', width: 12 }, { header: 'Região', key: 'region', width: 18 }, { header: 'Bairro', key: 'neighborhood', width: 26 },
    { header: 'Cidade', key: 'city', width: 24 }, { header: 'UF', key: 'state', width: 8 },
    ...(kind === 'leaders' ? [{ header: 'Coordenador', key: 'coordinator', width: 30 }] : [{ header: 'Líderes', key: 'leaders', width: 12 }]),
    { header: 'Apoiadores', key: 'supporters', width: 14 },
  ];
  rows.forEach((row) => sheet.addRow({ name: fullName(row), email: row.email, phone: phone(row.phone), status: row.active ? 'Ativo' : 'Inativo', region: region(row.zone), neighborhood: row.neighborhood || 'Não informado', city: row.city || '', state: row.state || '', coordinator: row.coordinatorName || 'Sem coordenador', leaders: row.leadersCount || 0, supporters: row.supportersCount }));
  styleSheet(sheet);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
