/**
 * Brazilian Banking Calendar Utility (Febraban / BACEN)
 * Calcula feriados nacionais (fixos e móveis), finais de semana e prazos de compensação bancária.
 */

// Cálculo da Páscoa (Algoritmo de Meeus/Jones/Butcher)
function getEasterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function parseDateInput(dateInput: Date | string): Date {
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    }
  }
  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNationalHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // Feriados Nacionais Fixos
  holidays.add(`${year}-01-01`); // Confraternização Universal
  holidays.add(`${year}-04-21`); // Tiradentes
  holidays.add(`${year}-05-01`); // Dia do Trabalho
  holidays.add(`${year}-09-07`); // Independência do Brasil
  holidays.add(`${year}-10-12`); // Nossa Sra Aparecida
  holidays.add(`${year}-11-02`); // Finados
  holidays.add(`${year}-11-15`); // Proclamação da República
  holidays.add(`${year}-11-20`); // Dia da Consciência Negra (Lei 14.759/2023)
  holidays.add(`${year}-12-25`); // Natal

  // Feriados Móveis (Baseados na Páscoa)
  const easter = getEasterDate(year);
  const easterDate = new Date(year, easter.month - 1, easter.day, 12, 0, 0);

  // Carnaval: Segunda (-48 dias) e Terça (-47 dias)
  const carnavalSeg = new Date(easterDate);
  carnavalSeg.setDate(easterDate.getDate() - 48);
  holidays.add(formatDateToYYYYMMDD(carnavalSeg));

  const carnavalTer = new Date(easterDate);
  carnavalTer.setDate(easterDate.getDate() - 47);
  holidays.add(formatDateToYYYYMMDD(carnavalTer));

  // Sexta-feira Santa / Paixão de Cristo (-2 dias)
  const sextaSanta = new Date(easterDate);
  sextaSanta.setDate(easterDate.getDate() - 2);
  holidays.add(formatDateToYYYYMMDD(sextaSanta));

  // Corpus Christi (+60 dias)
  const corpusChristi = new Date(easterDate);
  corpusChristi.setDate(easterDate.getDate() + 60);
  holidays.add(formatDateToYYYYMMDD(corpusChristi));

  return holidays;
}

export function isWeekend(dateInput: Date | string): boolean {
  const d = parseDateInput(dateInput);
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

export function isNationalHoliday(dateInput: Date | string): boolean {
  const d = parseDateInput(dateInput);
  const year = d.getFullYear();
  const dateStr = formatDateToYYYYMMDD(d);
  const holidays = getNationalHolidays(year);
  return holidays.has(dateStr);
}

export function isBusinessDay(dateInput: Date | string): boolean {
  return !isWeekend(dateInput) && !isNationalHoliday(dateInput);
}

export function getNextBusinessDay(dateInput: Date | string): string {
  let curr = parseDateInput(dateInput);
  while (!isBusinessDay(curr)) {
    curr.setDate(curr.getDate() + 1);
  }
  return formatDateToYYYYMMDD(curr);
}

export function addBusinessDays(dateInput: Date | string, businessDays: number): string {
  let curr = parseDateInput(dateInput);
  let count = 0;
  
  if (businessDays <= 0) {
    return getNextBusinessDay(curr);
  }

  while (count < businessDays) {
    curr.setDate(curr.getDate() + 1);
    if (isBusinessDay(curr)) {
      count++;
    }
  }

  return formatDateToYYYYMMDD(curr);
}

/**
 * Calcula a data de vencimento útil baseada na regra contábil/bancária
 * - Transferência/Débito em Conta: D+1 útil
 * - Boleto: D+30 por parcela (ou customDays), prorrogado para próximo dia útil
 */
export function calculateDueDate(
  baseDateInput: Date | string,
  paymentType: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros',
  installmentIndex: number = 1,
  totalInstallments: number = 1,
  customDays?: number
): string {
  const baseDate = parseDateInput(baseDateInput);

  if (paymentType === 'Transferência') {
    // Transferência bancária / Débito em conta: D+1 dia útil
    return addBusinessDays(baseDate, 1);
  }

  // Boleto Bancário / Cheque
  const intervalDays = customDays !== undefined ? customDays : (installmentIndex * 30);
  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + intervalDays);

  // Se cair em fim de semana ou feriado, prorroga para o próximo dia útil subsequente
  return getNextBusinessDay(targetDate);
}
