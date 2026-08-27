import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { createSupportersWorkbook } from './supporter-export';

async function readExport(rows: Parameters<typeof createSupportersWorkbook>[0]) {
  const buffer = await createSupportersWorkbook(rows);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet('Apoiadores');
  assert.ok(sheet);
  return { buffer, sheet };
}

test('gera XLSX válido somente com Nome e Telefone', async () => {
  const { buffer, sheet } = await readExport([
    { firstName: ' Maria ', lastName: ' da  Silva ', phone: '5521999999999' },
    { firstName: 'João', lastName: 'Souza', phone: '21988888888' },
  ]);

  assert.equal(buffer.subarray(0, 2).toString(), 'PK');
  assert.equal(sheet.columnCount, 2);
  assert.equal(sheet.rowCount, 3);
  assert.equal(sheet.getCell('A1').value, 'Nome');
  assert.equal(sheet.getCell('B1').value, 'Telefone');
  assert.equal(sheet.getCell('A2').value, 'Maria da Silva');
  assert.equal(sheet.getCell('B2').value, '(21) 99999-9999');
  assert.equal(sheet.getCell('B2').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getColumn(2).numFmt, '@');
});

test('lista vazia gera XLSX válido apenas com cabeçalho', async () => {
  const { sheet } = await readExport([]);
  assert.equal(sheet.rowCount, 1);
  assert.equal(sheet.columnCount, 2);
});
