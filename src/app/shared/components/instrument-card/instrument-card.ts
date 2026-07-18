import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  MarketInstrumentCard,
  ValuedPaperPosition,
} from '../../../features/dashboard/dashboard.models';
import { formatCurrency, formatDecimal, formatQuantity } from '../../formatting/decimal-format';

@Component({
  selector: 'app-instrument-card',
  imports: [DatePipe],
  templateUrl: './instrument-card.html',
  styleUrl: './instrument-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentCard {
  readonly card = input.required<MarketInstrumentCard>();
  readonly valuedPosition = input<ValuedPaperPosition | null>(null);
  readonly currency = input('USDT');

  protected readonly formatDecimal = formatDecimal;
  protected readonly formatQuantity = formatQuantity;

  protected formatMoney(value: string | null): string {
    return formatCurrency(value, this.currency());
  }

  protected identity(): string {
    const instrument = this.card().instrument;
    return [
      instrument.asset,
      instrument.provider,
      instrument.market_type,
      instrument.interval,
    ].join(' · ');
  }
}
