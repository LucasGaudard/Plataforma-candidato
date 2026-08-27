import ExcelJS from 'exceljs';
import { formatPhone, normalizeBrazilianPhone } from '@platform/utils';

export type SupporterExportRow = {
  firstName: string;
  lastName: string;
  phone: string;
};

function supporterName(row: SupporterExportRow) {
  return `${row.firstName} ${row.lastName}`.replace(/\s+/g, ' ').trim();
}

function supporterPhone(phone: string) {
  return formatPhone(normalizeBrazilianPhone(phone) ?? phone);
}

export async function createSupportersWorkbook(rows: SupporterExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Conecta Eleitor';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Apoiadores');
  worksheet.columns = [
    { header: 'Nome', key: 'name', width: 36 },
    { header: 'Telefone', key: 'phone', width: 20, style: { numFmt: '@' } },
  ];
  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    worksheet.addRow({ name: supporterName(row), phone: supporterPhone(row.phone) });
  }

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
