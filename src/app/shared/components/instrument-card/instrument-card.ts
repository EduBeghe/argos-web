import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  MarketInstrumentCard,
  ValuedPaperPosition,
} from '../../../features/dashboard/dashboard.models';
import { formatCurrency, formatDecimal, formatQuantity } from '../../formatting/decimal-format';
import { MetricHelp } from '../metric-help/metric-help';
import {
  assetClassLabel,
  decisionActionLabel,
  interpretationLabel,
  marketTypeLabel,
  positionStatusLabel,
} from '../../formatting/presentation-labels';

@Component({
  selector: 'app-instrument-card',
  imports: [DatePipe, MetricHelp],
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
  protected readonly assetClassLabel = assetClassLabel;
  protected readonly decisionActionLabel = decisionActionLabel;
  protected readonly interpretationLabel = interpretationLabel;
  protected readonly positionStatusLabel = positionStatusLabel;

  protected formatMoney(value: string | null): string {
    return formatCurrency(value, this.currency());
  }

  protected identity(): string {
    const instrument = this.card().instrument;
    return [
      instrument.asset,
      instrument.provider,
      marketTypeLabel(instrument.market_type),
      instrument.interval,
    ].join(' · ');
  }

  protected detailHref(): string {
    const instrument = this.card().instrument;
    const query = new URLSearchParams({
      asset: instrument.asset,
      provider: instrument.provider,
      market_type: instrument.market_type,
      interval: instrument.interval,
      range: '24h',
    });
    return `/instruments/detail?${query.toString()}`;
  }
}
