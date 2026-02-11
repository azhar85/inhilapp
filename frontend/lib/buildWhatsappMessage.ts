import { formatRupiah } from './formatRupiah';
import type { Order } from './types';

export function buildWhatsappMessage(order: Order) {
  const lines: string[] = [];

  lines.push('Halo Admin InhilApp, saya sudah melakukan pembayaran.');
  lines.push('');
  lines.push(`Order Code: ${order.order_code}`);
  lines.push(`Nama: ${order.customer_name}`);
  lines.push(`WhatsApp: ${order.customer_whatsapp}`);
  lines.push('');
  lines.push('Items:');

  order.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.product_name_snapshot} x${item.qty} = ${formatRupiah(
        item.line_total
      )}`
    );
  });

  lines.push('');
  lines.push(`Total: ${formatRupiah(order.total_amount)}`);
  lines.push('');
  lines.push(
    'Instruksi: saya akan mengirim screenshot bukti pembayaran setelah ini. Terima kasih.'
  );

  return lines.join('\n');
}
