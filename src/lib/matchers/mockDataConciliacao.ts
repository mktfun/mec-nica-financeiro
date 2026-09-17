import { OfxTransaction } from '@/lib/parsers/ofxParser';
import { ParsedOS } from '@/hooks/useImportProcessor';

export const DEFAULT_TARGET_DATE = '2026-09-16';

/**
 * 10 Transações OFX representativas baseadas em conciliações reais.
 * Inclui:
 * - Matches nominais unívocos
 * - Colisões de mesmo valor na mesma data (teste de desempate)
 * - Falsos positivos clássicos de sobrenomes comuns com valores divergentes
 * - Tolerâncias de arredondamento e de data
 * - Lançamentos órfãos
 */
export const MOCK_OFX_TRANSACTIONS: OfxTransaction[] = [
  {
    storeName: 'Planalto',
    amount: 450.00,
    type: 'in',
    date: '2026-09-16T14:20:00Z',
    title: 'PIX QRS RENATO PEREIRA 123.456.789-00',
    counterpart_name: 'RENATO PEREIRA',
    fitid: 'ofx-mock-001'
  },
  {
    storeName: 'Planalto',
    amount: 350.00,
    type: 'in',
    date: '2026-09-16T15:10:00Z',
    title: 'PIX RECEBIDO CARLOS EDUARDO',
    counterpart_name: 'CARLOS EDUARDO SILVA',
    fitid: 'ofx-mock-002'
  },
  {
    storeName: 'Planalto',
    amount: 350.00,
    type: 'in',
    date: '2026-09-16T16:00:00Z',
    title: 'PIX ENVIADO MARCOS A SOUZA',
    counterpart_name: 'MARCOS ANTONIO SOUZA',
    fitid: 'ofx-mock-003'
  },
  {
    storeName: 'Planalto',
    amount: 50.00,
    type: 'in',
    date: '2026-09-16T11:00:00Z',
    title: 'PIX QRS MARIA SILVA',
    counterpart_name: 'MARIA SILVA',
    fitid: 'ofx-mock-004'
  },
  {
    storeName: 'Planalto',
    amount: 180.00,
    type: 'in',
    date: '2026-09-16T10:30:00Z',
    title: 'PIX TRANSF JOAO SILVA',
    counterpart_name: 'JOAO SILVA',
    fitid: 'ofx-mock-005'
  },
  {
    storeName: 'Planalto',
    amount: 720.00,
    type: 'in',
    date: '2026-09-16T09:15:00Z',
    title: 'PIX RECEBIDO LUCAS MARTINS',
    counterpart_name: 'LUCAS MARTINS',
    fitid: 'ofx-mock-006'
  },
  {
    storeName: 'Planalto',
    amount: 600.00,
    type: 'in',
    date: '2026-09-16T12:00:00Z',
    title: 'PIX QRS ROBERTO COSTA',
    counterpart_name: 'ROBERTO COSTA',
    fitid: 'ofx-mock-007'
  },
  {
    storeName: 'Planalto',
    amount: 289.98,
    type: 'in',
    date: '2026-09-16T17:00:00Z',
    title: 'PIX ENVIADO JULIANA ALVES',
    counterpart_name: 'JULIANA ALVES',
    fitid: 'ofx-mock-008'
  },
  {
    storeName: 'Planalto',
    amount: 95.50,
    type: 'in',
    date: '2026-09-16T13:45:00Z',
    title: 'PIX RECEBIDO CLIENTE AVULSO BANCO INTER',
    counterpart_name: 'CLIENTE AVULSO',
    fitid: 'ofx-mock-009'
  },
  {
    storeName: 'Planalto',
    amount: 512.40,
    type: 'in',
    date: '2026-09-16T18:30:00Z',
    title: 'PIX QRS THIAGO ROCHA 999.888.777-66',
    counterpart_name: 'THIAGO ROCHA',
    fitid: 'ofx-mock-010'
  }
];

/**
 * 10 Ordens de Serviço (OSs) do pátio com valores, clientes e formas de pagamento.
 */
export const MOCK_OS_LIST: ParsedOS[] = [
  {
    os_number: '1001',
    plate: 'ABC-1234',
    client_name: 'RENATO PEREIRA',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T14:15:00',
    total_value: 450.00,
    paid_value: 450.00,
    parsed_pix_transfer: 450.00,
    payment_method: 'PIX: 450.00',
    status: 'finalizado'
  },
  {
    os_number: '1002',
    plate: 'DEF-5678',
    client_name: 'CARLOS EDUARDO SILVA',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T15:00:00',
    total_value: 350.00,
    paid_value: 350.00,
    parsed_pix_transfer: 350.00,
    payment_method: 'PIX: 350.00',
    status: 'finalizado'
  },
  {
    os_number: '1003',
    plate: 'GHI-9012',
    client_name: 'MARCOS ANTONIO SOUZA',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T15:50:00',
    total_value: 350.00,
    paid_value: 350.00,
    parsed_pix_transfer: 350.00,
    payment_method: 'PIX: 350.00',
    status: 'finalizado'
  },
  {
    os_number: '1004',
    plate: 'JKL-3456',
    client_name: 'MARIA SILVA',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T10:00:00',
    total_value: 1250.00,
    paid_value: 0,
    parsed_pix_transfer: 0,
    payment_method: 'Boleto: 1250.00',
    status: 'em_aberto'
  },
  {
    os_number: '1005',
    plate: 'MNO-7890',
    client_name: 'PEDRO SILVA',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T10:20:00',
    total_value: 890.00,
    paid_value: 890.00,
    parsed_pix_transfer: 890.00,
    payment_method: 'PIX: 890.00',
    status: 'finalizado'
  },
  {
    os_number: '1006',
    plate: 'PQR-1122',
    client_name: 'LUCAS MARTINS',
    opened_at: '2026-09-15',
    closed_at: '2026-09-15T18:00:00',
    total_value: 720.00,
    paid_value: 720.00,
    parsed_pix_transfer: 720.00,
    payment_method: 'PIX: 720.00',
    status: 'finalizado'
  },
  {
    os_number: '1007',
    plate: 'STU-3344',
    client_name: 'ROBERTO COSTA',
    opened_at: '2026-09-10', // 6 dias antes (fora da tolerância de D-1 a D+1)
    closed_at: '2026-09-10T12:00:00',
    total_value: 600.00,
    paid_value: 600.00,
    parsed_pix_transfer: 600.00,
    payment_method: 'PIX: 600.00',
    status: 'finalizado'
  },
  {
    os_number: '1008',
    plate: 'VWX-5566',
    client_name: 'JULIANA ALVES',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T16:50:00',
    total_value: 290.00, // Diferença de 2 centavos em relação a R$ 289,98
    paid_value: 290.00,
    parsed_pix_transfer: 290.00,
    payment_method: 'PIX: 290.00',
    status: 'finalizado'
  },
  {
    os_number: '1009',
    plate: 'YZA-7788',
    client_name: 'THIAGO ROCHA',
    opened_at: '2026-09-16',
    closed_at: '2026-09-16T18:00:00',
    total_value: 512.40,
    paid_value: 512.40,
    parsed_pix_transfer: 512.40,
    payment_method: 'PIX: 512.40',
    status: 'finalizado'
  },
  {
    os_number: '1010',
    plate: 'BCD-9900',
    client_name: 'FERNANDO GOMES',
    opened_at: '2026-09-16',
    closed_at: null,
    total_value: 1100.00,
    paid_value: 1100.00,
    parsed_pix_transfer: 1100.00,
    payment_method: 'PIX: 1100.00',
    status: 'em_aberto'
  }
];
