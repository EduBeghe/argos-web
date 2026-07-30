export interface MetricDefinition {
  key: string;
  title: string;
  explanation: string;
  rangeOrUnit?: string;
  interpretation?: string;
  limitation?: string;
}

export const METRIC_DEFINITIONS = {
  strategyReturn: definition(
    'strategyReturn',
    'Strategy return',
    'The Strategy result through the authoritative persisted Equity Snapshot.',
    'Percentage',
    'It is calculated by the API from persisted evidence.',
    'A simulated historical result does not predict future returns.',
  ),
  benchmarkReturn: definition(
    'benchmarkReturn',
    'Benchmark return',
    'The result of the equal-weight buy-and-hold reference through the same boundary.',
    'Percentage',
    'It provides a passive outcome reference.',
    'It does not share the Strategy exposure or risk profile.',
  ),
  excessReturn: definition(
    'excessReturn',
    'Excess return',
    'Strategy return minus benchmark return at the same authoritative boundary.',
    'Percentage points',
    'Positive means the Strategy return was higher for this period.',
    'It is not alpha or an equal-risk comparison.',
  ),
  strategyMinusBenchmarkPnl: definition(
    'strategyMinusBenchmarkPnl',
    'Strategy minus benchmark P&L',
    'Strategy ending equity minus benchmark ending equity.',
    'Account currency',
    undefined,
    'It compares outcomes and does not adjust for different exposure or risk.',
  ),
  realizedGrossPnl: definition(
    'realizedGrossPnl',
    'Gross realized P&L',
    'Profit or loss from closed Positions before persisted execution fees.',
    'Account currency',
    undefined,
    'It includes only closed Position evidence.',
  ),
  realizedNetPnl: definition(
    'realizedNetPnl',
    'Net realized P&L',
    'Profit or loss from closed Positions after persisted costs.',
    'Account currency',
    undefined,
    'It includes only closed Position evidence.',
  ),
  evaluationUnrealizedPnl: definition(
    'evaluationUnrealizedPnl',
    'Unrealized P&L',
    'Open-Position P&L stored in the latest authoritative Equity Snapshot.',
    'Account currency',
    undefined,
    'It is not realized and no hypothetical exit cost is deducted.',
  ),
  feesPaid: definition(
    'feesPaid',
    'Fees paid',
    'The sum of fees recorded on persisted Paper Trades through the evaluation boundary.',
    'Account currency',
    undefined,
    'Real exchange fees may differ.',
  ),
  estimatedSlippageCost: definition(
    'estimatedSlippageCost',
    'Estimated slippage cost',
    'The unfavorable difference between observed and simulated execution prices, multiplied by quantity.',
    'Account currency',
    undefined,
    'It is a simplified simulation estimate.',
  ),
  winRate: definition(
    'winRate',
    'Win rate',
    'Winning closed Positions divided by all closed Positions.',
    'Percentage',
    undefined,
    'It is unavailable until at least one Position closes.',
  ),
  averageWin: definition(
    'averageWin',
    'Average win',
    'The arithmetic mean of positive net realized P&L among closed Positions.',
    'Account currency',
    undefined,
    'It is unavailable when there are no winning Positions.',
  ),
  averageLoss: definition(
    'averageLoss',
    'Average loss',
    'The arithmetic mean of negative net realized P&L among closed Positions.',
    'Account currency',
    undefined,
    'It is unavailable when there are no losing Positions.',
  ),
  profitFactor: definition(
    'profitFactor',
    'Profit factor',
    'Total positive net realized P&L divided by the absolute total negative net realized P&L.',
    'Ratio',
    undefined,
    'It is unavailable when there are no losses; Argos does not fabricate Infinity.',
  ),
  equalWeightBenchmark: definition(
    'equalWeightBenchmark',
    'Equal-weight benchmark',
    'A passive reference that allocates initial equity equally across the complete persisted Decision universe.',
    undefined,
    'It compares outcomes with a fully invested reference.',
    'It is not equal risk, alpha, or a profitability guarantee.',
  ),
  remainingBenchmarkCash: definition(
    'remainingBenchmarkCash',
    'Remaining benchmark cash',
    'Cash left after benchmark allocation, entry fees, slippage assumptions, and Decimal quantity rounding.',
    'Account currency',
    undefined,
    'It is part of the simulated benchmark, not exchange cash.',
  ),
  equity: definition(
    'equity',
    'Equity',
    'The estimated total value of the Paper Trading account: available cash plus the current market value of open positions.',
    'USDT',
    'It rises or falls with cash flows and current market prices.',
    'It includes unrealized values and does not represent realized profit alone.',
  ),
  initialEquity: definition(
    'initialEquity',
    'Initial equity',
    'The account value assigned when the Paper Trading run began.',
    'USDT',
    'Argos uses it as the starting reference for P&L and return.',
    'It is simulated capital, not money deposited at an exchange.',
  ),
  currentCash: definition(
    'currentCash',
    'Current cash',
    'The simulated account cash currently available outside open positions.',
    'USDT',
    'It changes when Paper Trading executions, fees, or proceeds are recorded.',
    'It is not the accountâ€™s total value while positions remain open.',
  ),
  positionsMarketValue: definition(
    'positionsMarketValue',
    'Positions market value',
    'The estimated combined value of all open Paper Trading positions at their current marks.',
    'USDT',
    'It shows how much of current equity is held in positions.',
    'Marks can change and are not guaranteed execution prices.',
  ),
  totalPnl: definition(
    'totalPnl',
    'Total P&L',
    'The difference between current equity and the runâ€™s initial equity.',
    'USDT',
    'Positive values are above the starting value; negative values are below it.',
    'It includes estimated open-position value and may change before positions close.',
  ),
  totalReturn: definition(
    'totalReturn',
    'Total return',
    'Total P&L expressed as a percentage of the runâ€™s initial equity.',
    'Percentage',
    'It makes performance easier to compare across accounts of different sizes.',
    'Past simulated return does not predict future performance.',
  ),
  persistedEquity: definition(
    'persistedEquity',
    'Persisted equity',
    'Account equity recorded at a completed decision boundary.',
    'USDT',
    'Argos uses these immutable observations for the historical equity series.',
    'It may be older than the current portfolio valuation.',
  ),
  changeFromStart: definition(
    'changeFromStart',
    'Change from start',
    'The persisted snapshotâ€™s equity minus the runâ€™s initial equity.',
    'USDT',
    'It shows the recorded gain or loss since the run began.',
    'It describes one persisted boundary and may trail the current valuation.',
  ),
  persistedReturn: definition(
    'persistedReturn',
    'Persisted return',
    'The persisted change from start expressed as a percentage of initial equity.',
    'Percentage',
    'It aligns with the latest persisted equity point shown in the chart.',
    'It may be older than the current portfolio valuation and is not a forecast.',
  ),
  currentDrawdown: definition(
    'currentDrawdown',
    'Current drawdown',
    'The decline from the highest persisted equity reached so far to the latest persisted equity.',
    'Percentage',
    'A larger value means the account is farther below its previous persisted peak.',
    'It uses historical snapshots and does not predict future losses.',
  ),
  maximumDrawdown: definition(
    'maximumDrawdown',
    'Maximum drawdown',
    'The largest peak-to-trough decline observed in persisted equity during this Paper Trading run.',
    'Percentage',
    'It describes the greatest historical downside recorded by the strategy.',
    'It does not predict the size of future losses.',
  ),
  peakEquity: definition(
    'peakEquity',
    'Peak equity',
    'The highest persisted account equity recorded during the run.',
    'USDT',
    'It is the reference used when measuring drawdown.',
    'A historical peak is not a guaranteed recoverable value.',
  ),
  lowestEquity: definition(
    'lowestEquity',
    'Lowest equity',
    'The lowest persisted account equity recorded during the run.',
    'USDT',
    'It summarizes the lowest historical snapshot value.',
    'It may not include newer changes between persisted boundaries.',
  ),
  snapshotCount: definition(
    'snapshotCount',
    'Snapshot count',
    'The number of immutable equity snapshots recorded for the Paper Trading run.',
    'Count',
    'More snapshots represent more completed historical boundaries.',
    'The count does not measure performance quality.',
  ),
  quantity: definition(
    'quantity',
    'Quantity',
    'The simulated amount of the asset held in an open position.',
    undefined,
    'It describes position size in units of the asset.',
    'It is a Paper Trading quantity and is not held at an exchange.',
  ),
  averageEntryPrice: definition(
    'averageEntryPrice',
    'Average entry price',
    'The average simulated execution price paid for the open position.',
    'Quote currency per asset unit',
    'It is the price reference used to evaluate the position.',
    'It includes only recorded Paper Trading entries and is not a live quote.',
  ),
  costBasis: definition(
    'costBasis',
    'Cost basis',
    'The total amount attributed to opening the position, including entry costs represented by Argos.',
    'USDT',
    'It is the comparison basis for unrealized P&L.',
    'It belongs to the simulation and may differ from real execution costs.',
  ),
  markPrice: definition(
    'markPrice',
    'Mark price',
    'The persisted market price Argos uses to value an open position.',
    'USDT per asset unit',
    'It provides a consistent valuation point for the dashboard.',
    'It may be older than the current market and is not a guaranteed execution price.',
  ),
  marketValue: definition(
    'marketValue',
    'Market value',
    'The estimated value of a position using its quantity and current Argos mark.',
    'USDT',
    'It contributes to current portfolio equity.',
    'It remains an estimate until a simulated sale is recorded.',
  ),
  unrealizedPnl: definition(
    'unrealizedPnl',
    'Unrealized P&L',
    'The estimated profit or loss on an open position using its current mark price.',
    'USDT',
    'Positive values are above cost basis; negative values are below it.',
    'It remains unrealized until the position is sold.',
  ),
  unrealizedReturn: definition(
    'unrealizedReturn',
    'Unrealized return',
    'Unrealized P&L expressed as a percentage of the positionâ€™s cost basis.',
    'Percentage',
    'It makes open-position movement easier to compare.',
    'It can change with the mark and is not a realized result.',
  ),
  fees: definition(
    'fees',
    'Fees',
    'Simulated trading costs applied to Paper Trading executions.',
    'USDT',
    'They reduce account performance to make the simulation more realistic.',
    'Actual exchange fees can differ.',
  ),
  feeRate: definition(
    'feeRate',
    'Fee rate',
    'The configured percentage of simulated trade notional charged as a fee on each Paper Trading execution. Argos uses it to model transaction costs. The actual accumulated fee amount is recorded separately, and real exchange fees may differ.',
    'Percentage of execution notional',
    undefined,
    'It is a simulation parameter, not a quote from an exchange.',
  ),
  slippage: definition(
    'slippage',
    'Slippage',
    'The modeled difference between the observed market price and the simulated execution price.',
    undefined,
    'It approximates that orders may not execute at the displayed price.',
    'The model is simplified and cannot reproduce every real market condition.',
  ),
  slippageRate: definition(
    'slippageRate',
    'Slippage rate',
    'The configured percentage Argos applies to the observed market price when calculating a simulated execution price. It approximates unfavorable price movement between observation and execution.',
    'Percentage of observed market price',
    undefined,
    'It is a simplified simulation assumption and does not reproduce order-book depth or every real market condition.',
  ),
  executionPrice: definition(
    'executionPrice',
    'Execution price',
    'The simulated price at which a Paper Trading order was recorded.',
    'USDT per asset unit',
    'It includes the execution assumptions applied by Argos.',
    'It is not evidence of an available real-money fill.',
  ),
  overallScore: definition(
    'overallScore',
    'Overall score',
    'Argosâ€™ combined technical score for this instrument under the current scoring model.',
    undefined,
    'It summarizes trend, momentum, volume confirmation, and volatility evidence.',
    'It is strategy evidence, not a guarantee or probability of future price movement.',
  ),
  signalStrength: definition(
    'signalStrength',
    'Signal strength',
    'The magnitude of the final technical evidence produced by the current scoring model.',
    undefined,
    'Higher values mean the model produced stronger evidence in its interpreted direction.',
    'It is not a probability of profit.',
  ),
  trendScore: definition(
    'trendScore',
    'Trend score',
    'Measures the direction and relative strength of the current price trend using technical trend indicators.',
    undefined,
    'Positive and negative values describe the modelâ€™s directional trend evidence.',
    'A measured trend can reverse and does not guarantee future movement.',
  ),
  momentumScore: definition(
    'momentumScore',
    'Momentum score',
    'Measures whether recent price movement is gaining positive or negative strength.',
    undefined,
    'Argos combines RSI and recent returns to produce this evidence.',
    'Momentum can change quickly and is not a trading instruction.',
  ),
  volumeActivity: definition(
    'volumeActivity',
    'Volume activity',
    'Compares current trading volume with its recent baseline.',
    'Ratio',
    'Higher activity means the current move has more market participation.',
    'Activity alone does not determine price direction.',
  ),
  volumeConfirmationFactor: definition(
    'volumeConfirmationFactor',
    'Volume confirmation factor',
    'The bounded factor Argos applies to directional evidence using relative volume activity.',
    'Factor',
    'It adjusts how strongly volume confirms the current evidence.',
    'Confirmation does not guarantee that a move will continue.',
  ),
  volatilityRatio: definition(
    'volatilityRatio',
    'Volatility ratio',
    'Measures recent price movement relative to the instrumentâ€™s price using ATR.',
    'Ratio',
    'Higher values generally mean wider and faster recent price changes.',
    'It measures movement ß«h‘éì¶»§q«^tØÛÜ™IËˆ	Ñ\™Xİ[Û˜[ØÛÜ™IËˆ	ÕHÛÛXš[™Y\™Xİ[Û˜[ÛÛšX][Ûˆ™Y›Ü™H›Û[YHÛÛ™š\›X][Ûˆ\È\YY‰Ëˆ[™Yš[™Yˆ	Ò]ÈÚYÛˆ[™XØ]\ÈH\™Xİ[ÛˆÙˆH[Ù[8 &\ÈYÙÜ™YØ]Y]šY[˜ÙK‰Ëˆ	Ò]\È[Ù[İ]]›İš[˜[˜ÚX[YšXÙHÜˆHİX\˜[YYİ]ÛÛYK‰Ëˆ
KˆœÚPÛÛšX][ÛˆYš[š][ÛŠˆ	ÜœÚPÛÛšX][Û‰Ëˆ	Ô”ÒHÛÛšX][Û‰Ëˆ	ÕH\ÙˆH\™Xİ[Û˜[ØÛÜ™HÛÛšX]YHH”ÒKX˜\ÙY[ÛY[[H]šY[˜ÙK‰Ëˆ[™Yš[™Yˆ	Ò]ÚİÜÈİÈ”ÒHY™™XİYH\œÚ\İYØÛÜ™K‰Ëˆ	Ô”ÒHØ[ˆ™[XZ[ˆ[]˜]YÜˆ\™\ÜÙY[™Úİ[›İ™H™X]Y\ÈHÙ\Z[K‰Ëˆ
Kˆ™]\›ŒPÛÛšX][ÛˆYš[š][ÛŠˆ	Ü™]\›ŒPÛÛšX][Û‰Ëˆ	Ô™]\›ˆHÛÛšX][Û‰Ëˆ	ÕHÛÛšX][Ûˆœ›ÛHH[Üİ™XÙ[Û™KXØ[™HšXÙH™]\›‹‰Ëˆ[™Yš[™Yˆ	Ò]Ø\\™\È™\H™XÙ[\™Xİ[Û˜[[İ™[Y[[ˆHØÛÜ™K‰Ëˆ	ÓÛ™HØ[™H\È[Z]Y]šY[˜ÙH[™Ø[ˆ™H›Ú\ŞK‰Ëˆ
Kˆ™]\›ŒLÛÛšX][ÛˆYš[š][ÛŠˆ	Ü™]\›ŒLÛÛšX][Û‰Ëˆ	Ô™]\›ˆLˆÛÛšX][Û‰Ëˆ	ÕHÛÛšX][Ûˆœ›ÛHšXÙH[İ™[Y[XÜ›ÜÜÈH]\İÙ[™KXØ[™HÚ[™İË‰Ëˆ[™Yš[™Yˆ	Ò]YÈHœ›ØY\ˆ™XÙ[\™]\›ˆšY]ÈÈH\™Xİ[Û˜[ØÛÜ™K‰Ëˆ	Ò\İÜšXØ[[İ™[Y[Ù\È›İİX\˜[YHÛÛ[X][Û‹‰Ëˆ
Kˆ]\İXÚ\Ú[ÛˆYš[š][ÛŠˆ	Û]\İXÚ\Ú[Û‰Ëˆ	Ó]\İXÚ\Ú[Û‰Ëˆ	ÕH[Üİ™XÙ[[[]]X›HXİ[ÛˆÙ[XİYHHÛÛ™šYİ\™Y\™ÛÜÈİ˜]YŞK‰Ëˆ[™Yš[™Yˆ	Ò]™XÛÜ™ÈÚ]Hİ˜]YŞHÛÛ˜ÛYYœ›ÛH\œÚ\İY]šY[˜ÙH]]›İ[™\K‰Ëˆ	Ò]\ÈH\\ˆ˜Y[™ÈXÚ\Ú[Û‹›İš[˜[˜ÚX[YšXÙHÜˆH™X[[[Û™^HÜ™\‹‰Ëˆ
Kˆ™\]Y\İY\™Ù]Ü›Û[Ô\˜Ù[YÙNˆYš[š][ÛŠˆ	Ü™\]Y\İY\™Ù]Ü›Û[Ô\˜Ù[YÙIËˆ	Ô™\]Y\İY\™Ù]Ü›Û[È\˜Ù[YÙIËˆ	ÕHÜ›Û[ÈÚ\™HHİ˜]YŞH™\]Y\İY›Üˆ[ˆÜ[š[™ÈÜˆY\İYÜÚ][Û‹‰Ëˆ	Ô\˜Ù[YÙIËˆ	Ò]^™\ÜÙ\Èİ˜]YŞHÚ^š[™È[[]HXÚ\Ú[Ûˆ›İ[™\K‰Ëˆ	Ñ^Xİ][ÛˆÛÛœİ˜Z[È[™XØÛİ[İ]HØ[ˆY™™XİHÚ[][]Y™\İ[‰Ëˆ
Kˆ™\]Y\İYÜÚ][Û”\˜Ù[YÙNˆYš[š][ÛŠˆ	Ü™\]Y\İYÜÚ][Û”\˜Ù[YÙIËˆ	Ô™\]Y\İYÜÚ][Ûˆ\˜Ù[YÙIËˆ	ÕHÚ\™HÙˆ[ˆ^\İ[™ÈÜÚ][ÛˆHİ˜]YŞH™\]Y\İYÈÙ[‰Ëˆ	Ô\˜Ù[YÙIËˆ	Ò]^™\ÜÙ\ÈHXÚ\Ú[Û¸ &\È[[™Y™YXİ[Û‹‰Ëˆ	Ò]\ØÜšX™\ÈÚ[][]Yİ˜]YŞH[[›İH™X[Ü™\‹‰Ëˆ
KˆÜÚ][Û”İ]\ÎˆYš[š][ÛŠˆ	ÜÜÚ][Û”İ]\ÉËˆ	ÔÜÚ][Ûˆİ]\ÉËˆ	ÕÚ]\ˆH\\ˆ˜Y[™ÈÜÚ][Ûˆ\Èİ\œ™[HÜ[ˆÜˆÛÜÙY‰Ëˆ[™Yš[™Yˆ	Ğ[ˆÜ[ˆÜÚ][Ûˆİ[Ú[™Ù\ÈÚ]]ÈX\šÎÈHÛÜÙYÜÚ][Ûˆ›ÈÛ™Ù\ˆ\ÈX\šÙ]^Üİ\™K‰Ëˆ	ÕHİ]\È\Y\ÈÛ›HÈH\™ÛÜÈÚ[][][Û‹‰Ëˆ
Kˆİ˜]YŞNˆYš[š][ÛŠˆ	Üİ˜]YŞIËˆ	Ôİ˜]YŞIËˆ	ÕH˜[YY™\œÚ[Û™Y[HÙ]]Ù[™\˜]YH\œÚ\İYXÚ\Ú[Û‹‰Ëˆ[™Yš[™Yˆ	Ò]Y[YšY\ÈÚXÚ™Z]š[Üˆ›ÙXÙYH™\İ[‰Ëˆ	ĞHİ˜]YŞH˜[YHÜˆ™\œÚ[ÛˆÙ\È›İ[\H›Ùš]Xš[]K‰Ëˆ
KˆÛÛ™šYİ\˜][Û•™\œÚ[ÛˆYš[š][ÛŠˆ	ØÛÛ™šYİ\˜][Û•™\œÚ[Û‰Ëˆ	ĞÛÛ™šYİ\˜][Ûˆ™\œÚ[Û‰Ëˆ	ÕH[[]]X›HÛÛ™šYİ\˜][Ûˆ™]š\Ú[Ûˆ\ÙY›ÜˆH[ˆÜˆXÚ\Ú[Û‹‰Ëˆ	Õ™\œÚ[Û‰Ëˆ	Ò]XZÙ\È™\İ[È˜XÙXX›HÈHÜXÚYšXÈÙ]ÙˆÛÛ™šYİ\™Y˜[Y\Ë‰Ëˆ	ÑY™™\™[™\œÚ[ÛœÈX^H›İ™H\™XİHÛÛ\\˜X›K‰Ëˆ
KˆÛÛ™š\›YYØ[™Y]NˆYš[š][ÛŠˆ	ØÛÛ™š\›YYØ[™Y]IËˆ	ĞÛÛ™š\›YYØ[™Y]IËˆ	ĞHœ›Ş™[ˆİ˜]YŞHØ[™Y]H]\ÜÙYH[\[Y[Y˜[Y][Ûˆ[™\ÛÛ]YØ[ËY›ÜØ\™\İÜš]\šXK‰Ëˆ[™Yš[™Yˆ	Ò]\È\İÜšXØ[]šY[˜ÙK›İH™YXİ[ÛˆÜˆİX\˜[YK‰Ëˆ
Kˆ™YXİ]™QYÙNˆYš[š][ÛŠˆ	Ü™YXİ]™QYÙIËˆ	Ô™YXİ]™HYÙIËˆ	Ô\œÚ\İYİ]\İXØ[]šY[˜ÙH]Hœ›Ş™[ˆX\šÙ]ÛÛ™][ÛˆØ\È\ÜÛØÚX]YÚ]H]\ˆšXÙH[İ™[Y[‰Ëˆ[™Yš[™Yˆ	Ò]\È™\ÙX\˜Ú]šY[˜ÙK›İH˜Y[™È[œİXİ[Û‹‰Ëˆ	Ò\İÜšXØ[™[][ÛœÚ\ÈX^H›İ\œÚ\İ‰Ëˆ
Kˆ™X\“Z\ÜÎˆYš[š][ÛŠˆ	Û™X\“Z\ÜÉËˆ	Ó™X\ˆZ\ÜÉËˆ	ĞH™\ÙX\˜ÚÛÛ™šYİ\˜][Ûˆ]\›ØXÚY]Y›İØ]\ÙK]™\HY˜[˜Ù[Y[™\]Z\™[Y[‰Ëˆ[™Yš[™Yˆ	ĞXİ[Û˜X›H[™XYÛ›ÜİXÈ™X\ˆZ\ÜÙ\È]™HY™™\™[YX[š[™ÜË‰Ëˆ	ĞH™X\ˆZ\ÜÈ\È›İ[ˆ\›İ™Yİ˜]YŞK‰Ëˆ
Kˆ›Ü›X[^™YZ\ÜÚ[™Ñ\İ[˜ÙNˆYš[š][ÛŠˆ	Û›Ü›X[^™YZ\ÜÚ[™Ñ\İ[˜ÙIËˆ	Ó›Ü›X[^™YZ\ÜÚ[™È\İ[˜ÙIËˆ	ÕHÛÛXš[™Y›Ü›X[^™YYšXÚ]XÜ›ÜÜÈ˜Z[Y™\ÙX\˜Ú™\]Z\™[Y[Ë‰Ëˆ	Ó›Û‹[™YØ]]™H\İ[˜ÙIËˆ	ÔÛX[\ˆ˜[Y\È\™HÛÜÙ\ˆÈHÛÛ™šYİ\™YØ]\Ë‰Ëˆ	Ò]\È›İH›Ø˜Xš[]HÙˆİXØÙ\ÜË‰Ëˆ
Kˆ›İ[™XÚÔİYÙNˆYš[š][ÛŠˆ	Ø›İ[™XÚÔİYÙIËˆ	Ğ›İ[™XÚÈİYÙIËˆ	ÕH™\ÙX\˜ÚİYÙHÚ\™HHÜ™X]\İÛÛœİ˜Z[ÛˆY˜[˜Ù[Y[Ø\ÈØœÙ\™Y‰Ëˆ
Kˆ\™Xİ[Û˜[]˜]NˆYš[š][ÛŠˆ	Ù\™Xİ[Û˜[]˜]IËˆ	Ñ\™Xİ[Û˜[]˜]IËˆ	ÕHÚ\™HÙˆ\ØX›HØœÙ\˜][ÛœÈÚÜÙH]\ˆ[İ™[Y[X]ÚYHœ›Ş™[ˆ\™Xİ[Û˜[[K‰Ëˆ	Ô\˜Ù[YÙIËˆ
Kˆ™[˜ÚX\šÒ[\›İ™[Y[ˆYš[š][ÛŠˆ	Ø™[˜ÚX\šÒ[\›İ™[Y[	Ëˆ	Ğ™[˜ÚX\šÈ[\›İ™[Y[	Ëˆ	ÕH\™Xİ[Û˜[]\˜]H[\›İ™[Y[İ™\ˆH[˜ÛÛ™][Û˜[ÛÛ\\š\ÛÛˆ›ÜˆHØ[YH]šY[˜ÙHÛXÙK‰Ëˆ	Ô\˜Ù[YÙHÚ[ÉËˆ
Kˆ\™Ù]Y™Yš[™[Y[ˆYš[š][ÛŠˆ	İ\™Ù]Y™Yš[™[Y[	Ëˆ	Õ\™Ù]Y™Yš[™[Y[	Ëˆ	ĞH›İ[™Y›ÛİË]\ÙX\˜Ú\›İ[™›ÛZ\Ú[™È\œÚ\İY™X\ˆZ\ÜÙ\Ë‰Ëˆ[™Yš[™Yˆ	Ò]™\Ù\™\ÈH^\İ[™ÈXÛÛ›ÛZXÈ[™˜[Y][ÛˆØ]\Ë‰Ëˆ	Ò]Ù\È›İXİ]˜]HHİ˜]YŞK‰Ëˆ
Kˆ˜Z[š[™ÎˆYš[š][ÛŠˆ	İ˜Z[š[™ÉËˆ	Õ˜Z[š[™ÉËˆ	Ò\İÜšXØ[]šY[˜ÙH\ÙYÈœ™Y^™HØ[™Y]H[\È[™\˜[Y]\œË‰Ëˆ
Kˆ˜[Y][ÛˆYš[š][ÛŠˆ	İ˜[Y][Û‰Ëˆ	Õ˜[Y][Û‰Ëˆ	ÔÙ\\˜]H\İÜšXØ[]šY[˜ÙH\ÙYÈXÚYHÚ]\ˆHœ›Ş™[ˆØ[™Y]HX^H™XXÚ\ÛÛ]Y\İ‰Ëˆ
Kˆ\ÛÛ]Y\İˆYš[š][ÛŠˆ	Ú\ÛÛ]Y\İ	Ëˆ	Ò\ÛÛ]Y\İ	Ëˆ	Ò[[İ]]šY[˜ÙH]˜[X]YÛ›HY\ˆ˜[Y][Ûˆ\ÜÙ\Ë‰Ëˆ[™Yš[™Yˆ[™Yš[™Yˆ	Õ\İ]šY[˜ÙH™]™\ˆ[™\ÈHØ[™Y]K‰Ëˆ
Kˆ\İ[˜ÙUÔ\ÜÎˆYš[š][ÛŠˆ	Ù\İ[˜ÙUÔ\ÜÉËˆ	Ñ\İ[˜ÙHÈ\ÜÉËˆ	ÕH™XÛÜ™Y›Ü›X[^™YYšXÚ]™[XZ[š[™È™Y›Ü™H[\XØX›H™\]Z\™[Y[È\ÜË‰Ëˆ	Ó›Û‹[™YØ]]™H\İ[˜ÙIËˆ[™Yš[™Yˆ	Ò]\È›İH›Ü™XØ\İ‰Ëˆ
KˆÙYÛY[İ[™]\›ˆYš[š][ÛŠˆ	ÜÙYÛY[İ[™]\›‰Ëˆ	Õİ[™]\›‰Ëˆ	Ô\˜Ù[YÙHÚ[™ÙH[ˆÚ[][]Y\]Z]Hİ™\ˆHÙYÛY[‰Ëˆ	Ô\˜Ù[YÙIËˆ[™Yš[™Yˆ	Ò\İÜšXØ[Ú[][]Y™]\›ˆÙ\È›İİX\˜[YH]\™H\™›Ü›X[˜ÙK‰Ëˆ
KˆÙYÛY[˜]ÙİÛˆYš[š][ÛŠˆ	ÜÙYÛY[˜]ÙİÛ‰Ëˆ	ÓX^[][H˜]ÙİÛ‰Ëˆ	Ó\™Ù\İ\İÜšXØ[XÛ[™Hœ›ÛHH™]š[İ\È\]Z]HXZÈ\š[™ÈHÙYÛY[‰Ëˆ	Ô\˜Ù[YÙIËˆ
KˆY™™\™[˜ÙUœÔ›ÙXİ[ÛˆYš[š][ÛŠˆ	ÙY™™\™[˜ÙUœÔ›ÙXİ[Û‰Ëˆ	ÑY™™\™[˜ÙHœÈ›ÙXİ[Û‰Ëˆ	ĞØ[™Y]H™]\›ˆZ[\ÈHİ\œ™[›ÙXİ[Ûˆİ˜]YŞH™]\›ˆİ™\ˆHØ[YHÙYÛY[‰Ëˆ	Ô\˜Ù[YÙHÚ[ÉËˆ
KˆY™™\™[˜ÙUœĞ^RÛˆYš[š][ÛŠˆ	ÙY™™\™[˜ÙUœĞ^RÛ	Ëˆ	ÑY™™\™[˜ÙHœÈ^H[™Û	Ëˆ	ĞØ[™Y]H™]\›ˆZ[\È^Z[™ÈÛ˜ÙH[™Û[™Èİ™\ˆHØ[YHÙYÛY[‰Ëˆ	Ô\˜Ù[YÙHÚ[ÉËˆ
KˆÙYÛY[™Y\ÎˆYš[š][ÛŠˆ	ÜÙYÛY[™Y\ÉËˆ	Ñ™Y\ÈZY	Ëˆ	ÔÚ[][]Y˜[œØXİ[ÛˆÛÜİËˆÛ\YÙH\È[˜ÛÜœÜ˜]Y[È^Xİ][ÛˆšXÙ\Ë‰Ëˆ	ĞXØÛİ[İ\œ™[˜ŞIËˆ
Kˆ[ØÜ™Y[š[™ĞÛ\ÜÚYšXØ][ÛˆYš[š][ÛŠˆ	Û[ØÜ™Y[š[™ĞÛ\ÜÚYšXØ][Û‰Ëˆ	ÔØÜ™Y[š[™È]šY[˜ÙHÛ\ÜÚYšXØ][Û‰Ëˆ	ÕH˜XÚÙ[™8 &\È™\œÚ[Û™Yİ[[X\HÙˆİÈ\œÚ\İYØÜ™Y[š[™È]šY[˜ÙHY]]Èİ]\İXØ[[\Ë‰Ëˆ[™Yš[™Yˆ	Ò][È\İ[™İZ\Ú]šY[˜ÙH]Ø\œ˜[È[Ü™H™\ÙX\˜Úœ›ÛH]šY[˜ÙH]Y›İ\ÜË‰Ëˆ	Ò]\È›İİ˜]YŞH\›İ˜[[™Ù\È›İ™YXİ›Ùš]Xš[]K‰Ëˆ
Kˆ[\™]Ô™][[ÛˆYš[š][ÛŠˆ	Û[\™]Ô™][[Û‰Ëˆ	Ô\™]È™][[Û‰Ëˆ	ÕÚ]\ˆHØÜ™Y[š[™È™\İ[™[XZ[™Y›Û‹YÛZ[˜]YXÜ›ÜÜÈH˜XÚÙ[™8 &\ÈÙ[XİYÛÛ\\š\ÛÛˆY]šXÜË‰Ëˆ	ÖY\ÈÜˆ›ÉËˆ	Ô™]Z[™Y™\İ[È™\™\Ù[˜YK[Ù™œÈ]Ù\™H›İ[šY›Ü›[HÛÜœÙH[ˆ[›İ\ˆ™\İ[‰Ëˆ	Ô™][[Ûˆ\È›İ›ÛÙˆÙˆXÛÛ›ÛZXÈ˜[YHÜˆ]\™H\™›Ü›X[˜ÙK‰Ëˆ
Kˆ[™Yš[™[Y[ˆYš[š][ÛŠˆ	Û[™Yš[™[Y[	Ëˆ	ÓS™Yš[™[Y[	Ëˆ	ĞH›İ[™Y›ÛİË]\^\š[Y[İ™\ˆ\œÚ\İYØÜ™Y[š[™È]šY[˜ÙKÙ[XİY˜\šXX›\ËØš™Xİ]™\Ë[™[Ù[\˜[Y]\œË‰Ëˆ[™Yš[™Yˆ	Ò]\İÈÜXÚYšXÈÛÛ™šYİ\˜][ÛœÈ[™\ˆH\˜X›K™\›ÙXÚX›H˜XÚÙ[™ÛÛ˜Xİ‰Ëˆ	Ô™Yš[™[Y[™[XZ[œÈ™\ÙX\˜Ú[™Ø[››İXİ]˜]HHİ˜]YŞK‰Ëˆ
Kˆ[™YXİ[Û“Øš™Xİ]™NˆYš[š][ÛŠˆ	Û[™YXİ[Û“Øš™Xİ]™IËˆ	Ô™YXİ[ÛˆØš™Xİ]™IËˆ	ÕH\™Ù]]Y\İ[Ûˆ\ÙYÈ]˜[X]HH[Ù[İXÚ\È]\™H™]\›ˆÜˆ]\™H\™Xİ[Û‹‰Ëˆ[™Yš[™Yˆ	ÑY™™\™[Øš™Xİ]™\È\İY™™\™[›Ü›\ÈÙˆ™YXİ]™H]šY[˜ÙK‰Ëˆ	Ğ[ˆØš™Xİ]™HÙ\È›İ[\H]]Èİ]]\ÈXİ[Û˜X›HÜˆ›Ùš]X›K‰Ëˆ
Kˆ[ÛÛ™šY[˜ÙPXÚÙ]ˆYš[š][ÛŠˆ	Û[ÛÛ™šY[˜ÙPXÚÙ]	Ëˆ	ĞÛÛ™šY[˜ÙHXÚÙ]	Ëˆ	ĞH™\]Y\İYœ˜Xİ[Ûˆ\ÙYÈÜ›İ\™YXİ[ÛœÈH[Ù[\™\ÜYİ™[™İ‰Ëˆ	Ñœ˜Xİ[Ûˆœ›ÛHÈIËˆ	Ò][È[œÜXİÚ]\ˆİ›Û™Ù\ˆ[Ù[İ]]È™Z]™YY™™\™[K‰Ëˆ	Ó[Ù[ÛÛ™šY[˜ÙH\È›İHØ[Xœ˜]Y›Ø˜Xš[]HÙˆ›Ùš]‰Ëˆ
Kˆ[šX[YÙ]ˆYš[š][ÛŠˆ	Û[šX[YÙ]	Ëˆ	ÕšX[YÙ]	Ëˆ	ÕHX^[][H[X™\ˆÙˆ™Yš[™[Y[ÛÛ™šYİ\˜][ÛœÈH˜XÚÙ[™X^HÙ[Xİ›Üˆ]˜[X][Û‹‰Ëˆ	ĞÛİ[	Ëˆ	Ò]›İ[™ÈÛÛ\]][Û˜[ÛÜšÈ[™XZÙ\È^\š[Y[ÈÜ\˜][Û˜[H™YXİX›K‰Ëˆ	ĞH\™Ù\ˆYÙ]Ù\È›İİX\˜[YH™]\ˆ]šY[˜ÙK‰Ëˆ
Kˆ[[[YPYÙ]ˆYš[š][ÛŠˆ	Û[[[YPYÙ]	Ëˆ	Ô[[YHYÙ]	Ëˆ	ÕHX^[][HØ[XÛØÚÈ[YH[İÙY›ÜˆH™Yš[™[Y[[‹‰Ëˆ	Ñ\˜][Û‰Ëˆ	Ò]™]™[ÈÛ™H^\š[Y[œ›ÛHÛÛœİ[Z[™È[›[Z]YÛÜšÙ\ˆ[YK‰Ëˆ	Õ\›Z[˜][Ûˆ]HYÙ]Ø[ˆX]™Hİ\Ú\ÙH˜[YÛÜšÈ[™]˜[X]Y‰Ëˆ
Kˆ[›ÙÜ™\ÜÎˆYš[š][ÛŠˆ	Û[›ÙÜ™\ÜÉËˆ	Ô›ÙÜ™\ÜÉËˆ	ĞÛÛ\]YÛÛ\]YÜˆ™]\ÙY]˜[X][ÛœÈ]šYYHH˜XÚÙ[™\Ù[XİY]˜[X][ÛˆÛİ[‰Ëˆ	Ñœ˜Xİ[Û‰Ëˆ	Ò]\ØÜšX™\È\˜X›H]Y]YHÛÜšÈÛÛ\]YÛÈ˜\‹‰Ëˆ	Ò]\È[˜]˜Z[X›H™Y›Ü™HHÙ[XİYÛÜšÈÛİ[^\İÈ[™Ù\È›İYX\İ\™H]šY[˜ÙH]X[]K‰Ëˆ
Kˆ[ÛÛ\]Y]˜[X][ÛˆYš[š][ÛŠˆ	Û[ÛÛ\]Y]˜[X][Û‰Ëˆ	ĞÛÛ\]Y]˜[X][Û‰Ëˆ	Ğ[ˆ]˜[X][Ûˆ™]ÛHØ[İ[]YHH™Yš[™[Y[ÛÜšÙ\ˆ›Üˆ\È[‹‰Ëˆ	ĞÛİ[	Ëˆ	Ò]\İ[™İZ\Ú\È™]ÈÛÜšÈœ›ÛH™]\ÙY]šY[˜ÙK‰Ëˆ	ĞÛÛ\]][Ûˆ[Û™HÙ\È›İYX[ˆH]šY[˜ÙH\ÜÙY‰Ëˆ
Kˆ[™]\ÙY]˜[X][ÛˆYš[š][ÛŠˆ	Û[™]\ÙY]˜[X][Û‰Ëˆ	Ô™]\ÙY]˜[X][Û‰Ëˆ	ĞÛÛ\]X›HÛÛ\]Y]šY[˜ÙH™]\ÙY[™\ˆH˜XÚÙ[™8 &\È^\š[Y[Y[]H[\Ë‰Ëˆ	ĞÛİ[	Ëˆ	Ô™]\ÙH]›ÚYÈ™\X][™È\]Z]˜[[[Ù[ÛÜšË‰Ëˆ	Ô™]\ÙH™[XZ[œÈ˜[YÛ›H›ÜˆH^XİÛÛ\]Xš[]HÛÛ˜Xİ[™]\Ù]]šY[˜ÙK‰Ëˆ
Kˆ[ÛZ]Y]˜[X][ÛˆYš[š][ÛŠˆ	Û[ÛZ]Y]˜[X][Û‰Ëˆ	ÓÛZ]Y]˜[X][Û‰Ëˆ	ĞH[›™YÛÛXš[˜][ÛˆH˜XÚÙ[™Y›İÙ[XİÜˆÛÛ\]HÚ][ˆH›İ[™Y^\š[Y[‰Ëˆ	ĞÛİ[	Ëˆ	Ò]^Z[œÈHY™™\™[˜ÙH™]ÙY[ˆHØ\\ÚX[ˆ[ˆ[™]˜[X]YÛÜšË‰Ëˆ	ÓÛZ]YÛÛ™šYİ\˜][ÛœÈ]™H›È™\İ[[™]\İ›İ™H[\œ™]Y\È˜Z[\™\Ë‰Ëˆ
Kˆ[YÙ]^]\İ[ÛˆYš[š][ÛŠˆ	Û[YÙ]^]\İ[Û‰Ëˆ	ĞYÙ]^]\İ[Û‰Ëˆ	ÕÚ]\ˆHÛÛ™šYİ\™YšX[Üˆ[[YH[Z]™]™[YY][Û˜[[›™YÛÜšË‰Ëˆ	ÖY\ÈÜˆ›ÉËˆ	Ò]Y[YšY\È[ˆÜ\˜][Û˜[[Z]Ûˆ^\š[Y[Ûİ™\˜YÙK‰Ëˆ	Ò]Ù\È›İ\ØÜšX™HÚ]\ˆÛÛ\]Y]šY[˜ÙH\ÈÛÛÙÜˆ˜Y‰Ëˆ
Kˆ[›ÛZ\Ú[™ÎˆYš[š][ÛŠˆ	Û[›ÛZ\Ú[™ÉËˆ	Ô›ÛZ\Ú[™È›Üˆİ˜]YŞHÚ[][][Û‰Ëˆ	Ñ]šY[˜ÙH]\ÜÙYH˜XÚÙ[™8 &\È™Yš[™[Y[[\È[™X^H›ØÙYYÈ]\ˆXÛÛ›ÛZXÈİ˜]YŞHÚ[][][Û‹‰Ëˆ[™Yš[™Yˆ	Ò]Y[YšY\ÈHØ[™Y]H›ÜˆH™^\ÛÛ]Y™\ÙX\˜ÚİYÙK‰Ëˆ	Ò]\È›İİ˜]YŞH\›İ˜[Xİ]˜][Û‹ÜˆH›Ùš]Xš[]HÛZ[K‰Ëˆ
Kˆ[[œİY™šXÚY[ˆYš[š][ÛŠˆ	Û[[œİY™šXÚY[	Ëˆ	Ò[œİY™šXÚY[]šY[˜ÙIËˆ	Ñ]šY[˜ÙH]Y›İÛÛZ[ˆ[›İYÚİ\ÜÈØ]\ÙHHİ\œ™[Û\ÜÚYšXØ][ÛˆÛÛ˜Xİ‰Ëˆ[™Yš[™Yˆ	Ò]™]™[ÈÙXZÈØ[\\Èœ›ÛH™Z[™È™\Ù[Y\ÈÛÛ˜Û\Ú]™K‰Ëˆ	Ò[œİY™šXÚY[Ù\È›İ›İ™H]H™[][ÛœÚ\Ø[ˆ™]™\ˆ^\İ‰Ëˆ
Kˆ[\ØØ\™YˆYš[š][ÛŠˆ	Û[\ØØ\™Y	Ëˆ	Ñ\ØØ\™Y	Ëˆ	Ñ]šY[˜ÙH]˜Z[YÛ™HÜˆ[Ü™H˜XÚÙ[™[\È[™\È›İ™]Z[™Y›ÜˆH™^™\ÙX\˜ÚİYÙK‰Ëˆ[™Yš[™Yˆ	Ò]™XÛÜ™ÈH[X™\˜]H™\ÙX\˜Ú™Z™Xİ[Û‹‰Ëˆ	ĞH\ØØ\™Y\İÜšXØ[ÛÛ™šYİ\˜][Ûˆ\È›İHİ][Y[X›İ]]™\H]\™H]\Ù]‰Ëˆ
Kˆ[[˜ÛÛ\]NˆYš[š][ÛŠˆ	Û[[˜ÛÛ\]IËˆ	Ò[˜ÛÛ\]H]šY[˜ÙIËˆ	Ñ]šY[˜ÙHœ›ÛHH[ˆÜˆ]˜[X][Ûˆ]\È›İ™XXÚYHÛÛ\]H\›Z[˜[™\İ[‰Ëˆ[™Yš[™Yˆ	Ò]Ø\›œÈ\Ù\œÈ›İÈ™X]\X[ÛÜšÙ\ˆİ]]\Èš[˜[‰Ëˆ	ÓY]šXÜÈØ[ˆÚ[™ÙH[[H˜XÚÙ[™ÛÛ\]\ÈÜˆ\›Z[˜]\ÈH[‹‰Ëˆ
Kˆ[\™Xİ[Û˜[XØİ\˜XŞNˆYš[š][ÛŠˆ	Û[\™Xİ[Û˜[XØİ\˜XŞIËˆ	Ñ\™Xİ[Û˜[XØİ\˜XŞIËˆ	ÕHÚ\™HÙˆ]˜[X]YØœÙ\˜][ÛœÈÚÜÙH™YXİY\™Xİ[ÛˆX]ÚYHØœÙ\™Y]\™H\™Xİ[Û‹‰Ëˆ	Ñœ˜Xİ[Û‰Ëˆ	Ò]YX\İ\™\È\™Xİ[Û˜[YÜ™Y[Y[XÜ›ÜÜÈ]šY[˜ÙK‰Ëˆ	Ò]YÛ›Ü™\È^[Ù™ˆÚ^™H[™Ù\È›İ\İX›\Ú›Ùš]Xš[]HY\ˆÛÜİË‰Ëˆ
Kˆ[X\œÛÛÛÜœ™[][ÛˆYš[š][ÛŠˆ	Û[X\œÛÛÛÜœ™[][Û‰Ëˆ	ÔX\œÛÛˆÛÜœ™[][Û‰Ëˆ	ÕH[™X\ˆ\ÜÛØÚX][Ûˆ™]ÙY[ˆ[Ù[İ]][™ØœÙ\™Y]\™H˜[Y\Ë‰Ëˆ	ĞÛÜœ™[][Ûˆœ›ÛHLHÈIËˆ	Ò]ÈÚYÛˆ[™XYÛš]YH\ØÜšX™H[™X\ˆÛË[[İ™[Y[‰Ëˆ	ĞÛÜœ™[][Ûˆ\È›İØ]\Ø][Ûˆ[™Ø[ˆ™H[œİX›Hİ]ÙˆØ[\K‰Ëˆ
Kˆ[ÜX\›X[ÛÜœ™[][ÛˆYš[š][ÛŠˆ	Û[ÜX\›X[ÛÜœ™[][Û‰Ëˆ	ÔÜX\›X[ˆ˜[šÈÛÜœ™[][Û‰Ëˆ	ÕH˜[šË[Ü™\ˆ\ÜÛØÚX][Ûˆ™]ÙY[ˆ[Ù[İ]][™ØœÙ\™Y]\™H˜[Y\Ë‰Ëˆ	ĞÛÜœ™[][Ûˆœ›ÛHLHÈIËˆ	Ò]\İÈÚ]\ˆYÚ\ˆ™YXİ[ÛœÈÙ[™\˜[H[YÛˆÚ]YÚ\ˆİ]ÛÛY\Ë‰Ëˆ	Ò]Ù\È›İYX\İ\™HXÛÛ›ÛZXÈ™]\›œÈÜˆ›İ™HHİX›HØ]\Ø[™[][ÛœÚ\‰Ëˆ
Kˆ[XYR[\›İ™[Y[ˆYš[š][ÛŠˆ	Û[XYR[\›İ™[Y[	Ëˆ	ÓPQH[\›İ™[Y[İ™\ˆ™\›ÉËˆ	ÕH™YXİ[Ûˆ[ˆYX[ˆXœÛÛ]H™YXİ[Ûˆ\œ›Üˆ™[]]™HÈ[Ø^\È™YXİ[™È™\›Ë‰Ëˆ	Ô™[]]™H[\›İ™[Y[	Ëˆ	Ò]ÛÛ\\™\ÈH[Ù[Ú]HÚ[\H›Ë[[İ™[Y[™Y™\™[˜ÙK‰Ëˆ	ÓİÙ\ˆİ]\İXØ[\œ›ÜˆÙ\È›İ™XÙ\ÜØ\š[H›ÙXÙH\ÙY[˜Y[™ÈXÚ\Ú[ÛœË‰Ëˆ
Kˆ[Ú›Û›ÛÙÚXØ[›ÛˆYš[š][ÛŠˆ	Û[Ú›Û›ÛÙÚXØ[›Û	Ëˆ	ĞÚ›Û›ÛÙÚXØ[›Û	Ëˆ	ÓÛ™H\ÛÛ]Y[YK[Ü™\™Y˜Z[š[™È[™˜[Y][Ûˆ]˜[X][Ûˆ[ˆH\œÚ\İY^\š[Y[‰Ëˆ	Ñ›Û	Ëˆ	Ó][\H›ÛÈ[\ÜÙ\ÜÈÚ]\ˆ]šY[˜ÙH™\X]ÈXÜ›ÜÜÈ\İÜšXØ[Ú[™İÜË‰Ëˆ	Ò\İÜšXØ[›ÛÈØ[››İİX\˜[YH\™›Ü›X[˜ÙH[ˆ[œÙY[ˆ]\™HX\šÙ]Ë‰Ëˆ
KŸH\ÈÛÛœİØ]\ÙšY\È™XÛÜ™İš[™ËY]šXÑYš[š][ÛÂ‚™^Ü\HY]šXÒÙ^HHÙ^[Ùˆ\[ÙˆQU’P×ÑQ’S’USÓ”ÎÂ‚™^Ü[˜İ[ÛˆY]šXÑYš[š][ÛŠY]šXÎˆY]šXÒÙ^JNˆY]šXÑYš[š][ÛˆÂˆ™]\›ˆQU’P×ÑQ’S’USÓ”ÖÛY]šX×NÂŸB‚™[˜İ[ÛˆYš[š][ÛŠˆÙ^Nˆİš[™Ëˆ]Nˆİš[™Ëˆ^[˜][Ûˆİš[™Ëˆ˜[™ÙSÜ•[š]Îˆİš[™Ëˆ[\œ™]][ÛÎˆİš[™Ëˆ[Z]][ÛÎˆİš[™ËŠNˆY]šXÑYš[š][ÛˆÂˆ™]\›ˆÈÙ^K]K^[˜][Û‹˜[™ÙSÜ•[š][\œ™]][Û‹[Z]][ÛˆNÂŸB