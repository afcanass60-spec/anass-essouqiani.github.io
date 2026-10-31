//+------------------------------------------------------------------+
//|                                              XauQuantumAI.mq5    |
//|   Autonomous XAUUSD Expert Advisor - rule engine + AI filter     |
//|   Research twin: python/xqai (same features, rules and risk)     |
//|                                                                  |
//|   No martingale, no grid, no averaging down, mandatory stop loss.|
//|   Profitability is NOT guaranteed. Validate before going live    |
//|   (docs/BACKTESTING.md, docs/GO_LIVE.md).                        |
//+------------------------------------------------------------------+
#property copyright "XAUUSD Quantum AI project"
#property version   "1.00"
#property description "XAUUSD autonomous EA: market structure + multi-timeframe scoring + optional AI filter."
#property description "Modes BACKTEST / DEMO / LIVE. LIVE requires an explicit confirmation and the account number."

#include "Include\Defines.mqh"
#include "Include\TimeUtils.mqh"
#include "Include\Indicators.mqh"
#include "Include\Structure.mqh"
#include "Include\Features.mqh"
#include "Include\Signals.mqh"
#include "Include\AIModel.mqh"
#include "Include\Bridge.mqh"
#include "Include\NewsFilter.mqh"
#include "Include\Logger.mqh"
#include "Include\RiskManager.mqh"
#include "Include\Trader.mqh"
#include "Include\SafetyGuard.mqh"
#include "Include\Dashboard.mqh"

//==================================================================== inputs
input group "=== Mode ==="
input ENUM_XQ_MODE      InpMode                    = XQ_MODE_DEMO;   // Operating mode
input string            InpLiveConfirmation        = "";             // LIVE: type I ACCEPT THE RISK OF REAL TRADING
input long              InpLiveAccount             = 0;              // LIVE: account number allowed to trade
input long              InpMagic                   = 20260501;       // Magic number

input group "=== Risk (capital protection first) ==="
input double            InpRiskPercent             = 0.5;    // Risk per trade, % of min(balance, equity)
input double            InpMaxRiskPercentHard      = 0.75;   // Refuse if the MIN LOT would risk more than this %
input double            InpMaxTotalRiskPercent     = 1.0;    // Max total open risk %
input int               InpMaxPositions            = 2;      // Max simultaneous positions
input int               InpMaxTradesPerDay         = 5;      // Max new trades per day
input double            InpDailyLossLimitPercent   = 2.0;    // Daily loss limit % (blocks new entries)
input double            InpMaxDrawdownPercent      = 5.0;    // Max drawdown % from peak (HALT, closes all)
input int               InpMaxConsecutiveLosses    = 3;      // Losing streak that stops trading for the day
input int               InpCooldownBarsAfterLoss   = 6;      // M5 bars without entries after a loss
input int               InpReduceRiskAfterLosses   = 2;      // Halve risk after N consecutive losses (never increase)
input double            InpMinMarginLevelPercent   = 300.0;  // Minimum margin level after entry
input double            InpCommissionPerLotSide    = 0.0;    // Commission per lot per side (account currency)
input int               InpSlippageAllowancePoints = 5;      // Slippage added to the SL distance for sizing
input bool              InpCloseOnDailyLimit       = false;  // Also close positions at the daily limit
input bool              InpResetHalt               = false;  // Explicitly clear a persisted HALT at start

input group "=== Signal engine (score /100) ==="
input double            InpMinScore                = 65.0;
input double            InpWStructure              = 20.0;
input double            InpWTrend                  = 20.0;
input double            InpWMomentum               = 15.0;
input double            InpWLiquidity              = 15.0;
input double            InpWVolatility             = 10.0;
input double            InpWPriceAction            = 10.0;
input double            InpWMTF                    = 10.0;
input double            InpMinRR                   = 2.0;
input double            InpMinRRMeanReversion      = 1.5;
input double            InpRRTarget                = 2.0;
input double            InpMaxRR                   = 4.0;
input double            InpSLBufferATR             = 0.3;
input double            InpMinSLATR                = 0.8;
input double            InpMaxSLATR                = 3.0;
input int               InpSwingDepth              = 3;
input string            InpRegimeMatrix            = "TU:PB,MO,BO|TD:PB,MO,BO|SQ:BO|RG:MR,SW,RV|TR:SW,RV,PB|VO:";
input bool              InpEnableTrendPullback     = true;
input bool              InpEnableBreakout          = true;
input bool              InpEnableLiquiditySweep    = true;
input bool              InpEnableReversal          = true;
input bool              InpEnableMomentum          = true;
input bool              InpEnableMeanReversion     = true;

input group "=== Artificial intelligence ==="
input ENUM_XQ_AI_MODE   InpAIMode                  = XQ_AI_OFF;
input string            InpModelFile               = "XQAI\\xqai_model.txt";  // in Common\Files
input double            InpAIMinProb               = 0.0;    // 0 = use the threshold stored in the model
input ENUM_XQ_DEGRADED  InpDegradedPolicy          = XQ_DEGRADED_NO_TRADE;
input double            InpDegradedScoreBonus      = 10.0;
input int               InpBridgeTimeoutMs         = 3000;
input int               InpBridgeHeartbeatMaxAge   = 15;

input group "=== Position management ==="
input bool              InpUseBreakEven            = true;
input double            InpBreakEvenR              = 1.0;
input bool              InpUsePartial              = true;
input double            InpPartialR                = 1.0;
input double            InpPartialFraction         = 0.5;
input bool              InpUseTrailing             = true;
input double            InpTrailStartR             = 1.5;
input double            InpTrailATRMult            = 2.5;
input bool              InpCloseOnStructureBreak   = true;
input double            InpCloseOnOppositeScore    = 80.0;
input int               InpMaxHoldBars             = 288;    // M5 bars (288 = 24 h)
input bool              InpCloseBeforeWeekend      = true;   // Friday 20:45 UTC

input group "=== Filters ==="
input double            InpMaxSpreadPoints         = 60;
input double            InpMaxSpreadATR            = 0.25;
input bool              InpTradeAsia               = false;
input bool              InpTradeLondon             = true;
input bool              InpTradeNewYork            = true;
input bool              InpTradeOverlap            = true;
input int               InpRolloverBlockMinutes    = 60;     // after server midnight (+30 min before)
input int               InpFridayLastEntryUTC      = 19;
input bool              InpNewsFilter              = true;
input int               InpNewsBeforeMin           = 30;
input int               InpNewsAfterMin            = 30;
input int               InpNewsFomcMin             = 60;
input string            InpNewsCsv                 = "XQAI\\calendar.csv";   // in Common\Files (tester/fallback)
input bool              InpNewsUnavailableBlocks   = true;   // live: block entries if no calendar source
input int               InpMaxDeviationPoints      = 30;
input int               InpMaxSlippagePoints       = 50;
input int               InpMaxSlippageEventsPerDay = 3;
input double            InpAbnormalRangeATR        = 6.0;    // M1 range > k * ATR(M5) => pause 30 min
input int               InpMaxTickAgeSec           = 120;

input group "=== Time zone ==="
input ENUM_XQ_TZ        InpServerTZ                = XQ_TZ_EET_US;
input double            InpServerGMTOffset         = 2.0;
input bool              InpUseLiveOffset           = true;

input group "=== System ==="
input int               InpBarsWindow              = 1000;
input int               InpWarmupBars              = 300;
input bool              InpShowDashboard           = true;
input bool              InpDumpFeatures            = false;  // write features for the Python parity check
input ENUM_XQ_LOG       InpLogLevel                = XQ_LOG_INFO;

//==================================================================== globals
CLogger         g_log;
CTimeModel      g_tz;
CSafetyGuard    g_guard;
CRiskManager    g_risk;
CTrader         g_trader;
CNativeModel    g_model;
CBridge         g_bridge;
CNewsFilter     g_news;
CDashboard      g_dash;
CTFData         g_m5, g_m15, g_m30, g_h1, g_h4, g_m1;

XQSignalParams  g_sp;
ENUM_XQ_MODE    g_mode;
int             g_maxPositions;
bool            g_paused = false;
datetime        g_lastM5 = 0, g_lastM1 = 0;
long            g_lastDay = 0;
double          g_atrM5 = 0.0;
XQStatus        g_st;
ulong           g_lastStatusMs = 0, g_lastDashMs = 0;
//--- pending AI request
bool            g_aiPending = false;
XQCandidate     g_pendCand;
datetime        g_pendTime = 0;
//--- statistics
int             g_nTrades = 0, g_nWins = 0;
double          g_grossWin = 0.0, g_grossLoss = 0.0, g_totalPnl = 0.0;

//==================================================================== helpers
string ModeName(void)
  {
   return (g_mode == XQ_MODE_BACKTEST) ? "BACKTEST" : ((g_mode == XQ_MODE_DEMO) ? "DEMO" : "LIVE");
  }

bool SessionAllowed(const int s)
  {
   if(s == XQ_S_ASIA)
      return InpTradeAsia;
   if(s == XQ_S_LONDON)
      return InpTradeLondon;
   if(s == XQ_S_NEWYORK)
      return InpTradeNewYork;
   if(s == XQ_S_OVERLAP)
      return InpTradeOverlap;
   return false;
  }

void LoadHistoryStats(void)
  {
   if(!HistorySelect(0, TimeCurrent()))
      return;
   int n = HistoryDealsTotal();
   for(int i = 0; i < n; i++)
     {
      ulong d = HistoryDealGetTicket(i);
      if(HistoryDealGetString(d, DEAL_SYMBOL) != _Symbol || HistoryDealGetInteger(d, DEAL_MAGIC) != InpMagic)
         continue;
      long e = HistoryDealGetInteger(d, DEAL_ENTRY);
      double pnl = HistoryDealGetDouble(d, DEAL_PROFIT) + HistoryDealGetDouble(d, DEAL_COMMISSION) + HistoryDealGetDouble(d, DEAL_SWAP);
      if(e == DEAL_ENTRY_IN)
        {
         g_totalPnl += HistoryDealGetDouble(d, DEAL_COMMISSION);
         continue;
        }
      g_totalPnl += pnl;
      g_nTrades++;               // counts closing deals (partials included) - approximate before restart
      if(pnl > 0)
        { g_nWins++; g_grossWin += pnl; }
      else
         g_grossLoss -= pnl;
     }
  }

void RecordDecision(const XQCandidate &c, const double prob, const int session, const string decision)
  {
   g_st.lastDecision = decision;
   g_log.Decision(g_pendTime > 0 ? g_pendTime : TimeCurrent(), c, prob, XQ_SessionName(session), decision);
   if(decision == "OPEN" || StringFind(decision, "sizing") >= 0 || decision == "ai_filter")
      g_log.Info(StringFormat("%s %s score=%.1f prob=%.3f -> %s", XQ_StrategyName(c.strategy), c.dir > 0 ? "BUY" : "SELL",
                              c.score, prob, decision));
  }

//--- AI state for the dashboard
string AIState(void)
  {
   if(InpAIMode == XQ_AI_OFF)
      return "OFF";
   string s = "";
   if(InpAIMode == XQ_AI_NATIVE || InpAIMode == XQ_AI_BRIDGE_FALLBACK)
      s += g_model.Loaded() ? "native OK " : "native MISSING ";
   if(InpAIMode == XQ_AI_BRIDGE || InpAIMode == XQ_AI_BRIDGE_FALLBACK)
      s += g_bridge.Alive() ? "bridge OK(" + g_bridge.ModelId() + ")" : "bridge DOWN";
   return s;
  }

//==================================================================== decision pipeline
//--- gates that do not depend on the AI (backtester.py order); returns "" if all pass
string PreGates(const XQCandidate &c, const datetime T, const datetime utc, const int session)
  {
   string why;
   if(!g_risk.CanOpen(why))
      return why;
   int dirOpen;
   bool allProt;
   int npos = g_trader.Count(dirOpen, allProt);
   if(npos >= g_maxPositions)
      return "max_positions";
   if(npos > 0 && dirOpen != c.dir)
      return "no_hedging";
   if(npos > 0 && !allProt)
      return "existing_position_not_protected";
   if(g_paused)
      return "manual_pause";
   if(!SessionAllowed(session))
      return "session";
   MqlDateTime sv;
   TimeToStruct(T, sv);
   int serverMod = sv.hour * 60 + sv.min;
   int hourUtc = (int)(((long)utc % 86400) / 3600);
   if(serverMod < InpRolloverBlockMinutes || serverMod >= 1440 - 30)
      return "time_filter";
   if(XQ_WeekdayUTC(utc) == 5 && hourUtc >= InpFridayLastEntryUTC)
      return "time_filter";
   if(InpNewsFilter)
     {
      string what;
      if(g_news.Blocked(T, what))
         return "news:" + what;
      if(!g_news.Available() && !MQLInfoInteger(MQL_TESTER) && InpNewsUnavailableBlocks)
         return "news_source_unavailable";
     }
   if(!g_guard.TradingAllowed(why))
      return why;
   if(!g_guard.TickFresh(InpMaxTickAgeSec))
      return "stale_ticks";
   return "";
  }

//--- execution-time checks, sizing and order (backtester.py: rr_after_execution .. total_risk)
string Execute(const XQCandidate &c, const double prob)
  {
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return "no_tick";
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double spread = tick.ask - tick.bid;
   if(spread > InpMaxSpreadPoints * point || spread > InpMaxSpreadATR * g_atrM5)
      return "spread";
   int d = c.dir;
   double entry = (d == 1) ? tick.ask : tick.bid;
   double risk = (entry - c.sl) * d;
   double minRR = (c.strategy == XQ_MEAN_REVERSION) ? InpMinRRMeanReversion : InpMinRR;
   if(risk <= 0 || risk > InpMaxSLATR * g_atrM5 * 1.1 || (c.tp - entry) * d < 0.9 * minRR * risk)
      return "rr_after_execution";
   double stops = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
   if(risk < stops + spread)
      return "stops_level";
   double riskMoney, riskPct;
   string why;
   double lots = g_risk.Size(d, entry, c.sl, riskMoney, riskPct, why);
   if(lots <= 0)
      return "sizing:" + why + StringFormat("(%.2f%%)", riskPct);
   int dirOpen;
   bool allProt;
   int npos = g_trader.Count(dirOpen, allProt);
   if(!g_risk.TotalRiskOk(riskMoney, npos > 0))
      return "total_risk";
   string comment = StringFormat("XQAI %s %.0f", XQ_StrategyCode(c.strategy), c.score);
   ulong tk = g_trader.Open(c, lots, riskMoney, comment);
   if(tk == 0)
     {
      if(g_trader.ConsecFailures() >= 3)
        {
         g_risk.Halt("3 consecutive order failures");
         g_log.Error("HALT: repeated execution failures");
        }
      return "order_failed";
     }
   g_risk.OnOpened();
   if(g_trader.SlippageEvents() >= InpMaxSlippageEventsPerDay)
      g_guard.Pause(24 * 60, "repeated adverse slippage");
   return "OPEN";
  }

double MinProb(void)
  {
   return (InpAIMinProb > 0) ? InpAIMinProb : g_model.Threshold();
  }

//--- continues the pipeline once an AI probability is known (prob < 0 = AI unavailable)
void Decide(const XQCandidate &c, double prob, const datetime T, const datetime utc, const int session, const bool aiUsed)
  {
   string decision;
   if(aiUsed && prob < 0)
     {
      // AI required but unavailable for this signal: degraded mode
      if(InpDegradedPolicy == XQ_DEGRADED_NO_TRADE)
        {
         RecordDecision(c, prob, session, "ai_unavailable");
         return;
        }
      if(c.score < InpMinScore + InpDegradedScoreBonus)
        {
         RecordDecision(c, prob, session, "score_degraded");
         return;
        }
     }
   else
      if(aiUsed && prob < MinProb())
        {
         RecordDecision(c, prob, session, "ai_filter");
         return;
        }
   string g = PreGates(c, T, utc, session);     // re-checked: time may have passed while waiting
   if(g != "")
     {
      RecordDecision(c, prob, session, g);
      return;
     }
   decision = Execute(c, prob);
   RecordDecision(c, prob, session, decision);
  }

void OnNewM5Bar(void)
  {
   g_risk.UpdateDay();
   string why;
   if(g_risk.UpdateEquity(why))
     {
      g_log.Error("RISK LIMIT: " + why + " -> closing all positions");
      g_trader.CloseAll("risk_limit");
     }
   //--- load data (closed bars only)
   int win = MathMax(InpBarsWindow, InpWarmupBars + 50);
   bool ok = g_m5.Load(_Symbol, PERIOD_M5, win) && g_m15.Load(_Symbol, PERIOD_M15, win)
             && g_m30.Load(_Symbol, PERIOD_M30, win) && g_h1.Load(_Symbol, PERIOD_H1, win)
             && g_h4.Load(_Symbol, PERIOD_H4, win);
   bool m1ok = g_m1.Load(_Symbol, PERIOD_M1, 300);
   if(!ok || g_m5.n < 30)
     {
      g_log.Warn("history not ready (CopyRates failed): no decision this bar");
      g_st.lastDecision = "history_not_ready";
      return;
     }
   g_m5.Compute(InpSwingDepth, true);
   g_m15.Compute(InpSwingDepth, true);
   g_m30.Compute(InpSwingDepth, true);
   g_h1.Compute(InpSwingDepth, true);
   g_h4.Compute(InpSwingDepth, true);
   XQM1Info m1;
   m1.ok = m1ok && g_m1.n > 30;
   if(m1ok)
     {
      g_m1.Compute(InpSwingDepth, false);
      m1.o = g_m1.O();
      m1.c = g_m1.C();
      m1.ema20 = g_m1.ema20[g_m1.n - 1];
     }
   else
     {
      m1.o = g_m5.C(); m1.c = g_m5.C(); m1.ema20 = g_m5.C();
     }
   g_atrM5 = (g_m5.n > 2) ? g_m5.ATR() : 0.0;

   datetime T = iTime(_Symbol, PERIOD_M5, 0);        // decision time = open of the new M5 bar
   datetime utc = g_tz.ToUTC(T);
   int session = XQ_SessionOfUTC(utc);
   XQCandidate best;
   XQCandidate all[];
   int regime;
   bool found = XQ_BestCandidate(g_m5, g_m15, g_m30, g_h1, g_h4, m1, g_sp, best, all, regime);
   g_st.regime = XQ_RegimeName(regime);
   g_st.session = XQ_SessionName(session);

   //--- exits decided at bar open (before entries, as in the backtester)
   bool chochLast = (g_m5.st.breakType == XQ_CHOCH && g_m5.st.breakIdx == g_m5.n - 1);
   int hourUtc = (int)(((long)utc % 86400) / 3600);
   int minUtc = (int)(((long)utc % 3600) / 60);
   bool weekend = InpCloseBeforeWeekend && XQ_WeekdayUTC(utc) == 5 && hourUtc >= 20 && minUtc >= 45;
   g_trader.BarExits(g_m5.st.breakDir, chochLast, found ? best.dir : 0, found ? best.score : 0.0,
                     InpCloseOnOppositeScore, InpCloseOnStructureBreak, InpMaxHoldBars, weekend);

   if(!found)
     {
      g_st.signal = "none";
      g_st.strategy = "-";
      g_st.score = 0;
      g_st.prob = -1;
      g_st.lastDecision = "no valid setup";
      return;
     }
   g_st.signal = (best.dir > 0 ? "BUY " : "SELL ") + StringFormat("SL %.2f TP %.2f RR %.2f", best.sl, best.tp, best.rr);
   g_st.strategy = XQ_StrategyName(best.strategy);
   g_st.score = best.score;
   g_st.prob = -1;

   double f[];
   bool needF = InpDumpFeatures || InpAIMode != XQ_AI_OFF;
   if(needF)
      XQ_AIFeatures(best, g_m5, g_m15, g_h1, utc, _Point, f);
   if(InpDumpFeatures)
      g_log.Features(T, best, f);

   g_pendTime = T;
   if(best.score < InpMinScore)
     {
      RecordDecision(best, -1, session, "score");
      return;
     }
   //--- anomaly checks before any entry
   if(m1ok && g_guard.AbnormalCandle(g_m1.H() - g_m1.L(), g_atrM5, InpAbnormalRangeATR))
      g_guard.Pause(30, "abnormal M1 candle");
   string g = PreGates(best, T, utc, session);
   if(g != "")
     {
      RecordDecision(best, -1, session, g);
      return;
     }
   //--- AI
   if(InpAIMode == XQ_AI_OFF)
     {
      Decide(best, -1, T, utc, session, false);
      return;
     }
   bool bridgeMode = (InpAIMode == XQ_AI_BRIDGE || InpAIMode == XQ_AI_BRIDGE_FALLBACK);
   if(bridgeMode && g_bridge.Alive() && !g_bridge.Pending())
     {
      if(g_bridge.Send(_Symbol, XQ_StrategyName(best.strategy), best.dir, f))
        {
         g_aiPending = true;
         g_pendCand = best;
         return;                              // continues in CheckBridge()
        }
     }
   double p = -1.0;
   if((InpAIMode == XQ_AI_NATIVE || InpAIMode == XQ_AI_BRIDGE_FALLBACK) && g_model.Loaded())
      p = g_model.Predict(f);
   g_st.prob = p;
   Decide(best, p, T, utc, session, true);
  }

void CheckBridge(void)
  {
   if(!g_aiPending)
      return;
   double p;
   int r = g_bridge.Poll(p);
   if(r == 0)
      return;
   g_aiPending = false;
   if(r < 0)
     {
      g_log.Warn("bridge: no valid answer (timeout/reject) -> fallback");
      p = -1.0;
      if(InpAIMode == XQ_AI_BRIDGE_FALLBACK && g_model.Loaded())
        {
         double f[];
         XQ_AIFeatures(g_pendCand, g_m5, g_m15, g_h1, g_tz.ToUTC(g_pendTime), _Point, f);
         p = g_model.Predict(f);
        }
     }
   g_st.prob = p;
   datetime utc = g_tz.ToUTC(g_pendTime);
   //--- refuse stale answers: the signal belongs to the bar it was computed on
   if(iTime(_Symbol, PERIOD_M5, 0) != g_pendTime)
     {
      RecordDecision(g_pendCand, p, XQ_SessionOfUTC(utc), "ai_answer_too_late");
      return;
     }
   Decide(g_pendCand, p, g_pendTime, utc, XQ_SessionOfUTC(utc), true);
  }

void RefreshStatus(void)
  {
   g_st.mode = ModeName();
   g_st.balance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_st.equity = AccountInfoDouble(ACCOUNT_EQUITY);
   g_st.dayPnl = g_st.equity - g_risk.DayStartEquity();
   g_st.totalPnl = g_totalPnl;
   g_st.ddPct = g_risk.DrawdownPct();
   g_st.trades = g_nTrades;
   g_st.tradesToday = g_risk.TradesToday();
   g_st.winRate = (g_nTrades > 0) ? 100.0 * g_nWins / g_nTrades : 0.0;
   g_st.profitFactor = (g_grossLoss > 0) ? g_grossWin / g_grossLoss : 0.0;
   g_st.riskOpen = g_risk.OpenRisk();
   int dirOpen;
   bool allProt;
   g_st.positions = g_trader.Count(dirOpen, allProt);
   g_st.aiState = AIState();
   string what;
   if(!InpNewsFilter)
      g_st.news = "filter OFF";
   else
      g_st.news = g_news.Blocked(TimeCurrent(), what) ? "BLOCK " + what : "clear (" + g_news.Source() + ")";
   g_st.nextEvent = InpNewsFilter ? g_news.Next(TimeCurrent()) : "-";
   g_st.halt = g_risk.Halted() ? g_risk.HaltReason() : "";
   g_st.paused = g_paused;
  }

//==================================================================== events
int OnInit(void)
  {
   g_log.Init(InpLogLevel, true);
   g_log.Info("XAUUSD Quantum AI " + XQAI_VERSION + " starting on " + _Symbol);
   if(!g_guard.InitChecks(_Symbol, GetPointer(g_log), InpMode, InpLiveConfirmation, InpLiveAccount, g_mode))
      return INIT_FAILED;
   if(InpRiskPercent <= 0 || InpRiskPercent > 2.0 || InpMaxRiskPercentHard < InpRiskPercent)
     {
      g_log.Error("risk settings refused: 0 < InpRiskPercent <= 2 and InpMaxRiskPercentHard >= InpRiskPercent");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpRiskPercent > 1.0)
      g_log.Warn("risk per trade above 1% is outside the design range of this EA (0.25-0.5%)");
   g_tz.model = InpServerTZ;
   g_tz.fixedHours = InpServerGMTOffset;
   g_tz.useLiveOffset = InpUseLiveOffset;
   if(!MQLInfoInteger(MQL_TESTER))
      g_log.Info(StringFormat("server offset measured %+.1f h, model %+.1f h", g_tz.LiveOffset() / 3600.0,
                              g_tz.ModelOffset(TimeTradeServer()) / 3600.0));

   //--- signal parameters
   double w[XQAI_N_COMPONENTS];
   w[0] = InpWStructure; w[1] = InpWTrend; w[2] = InpWMomentum; w[3] = InpWLiquidity;
   w[4] = InpWVolatility; w[5] = InpWPriceAction; w[6] = InpWMTF;
   double ws = 0;
   for(int k = 0; k < XQAI_N_COMPONENTS; k++)
      ws += w[k];
   if(ws <= 0)
      return INIT_PARAMETERS_INCORRECT;
   for(int k = 0; k < XQAI_N_COMPONENTS; k++)
      g_sp.w[k] = 100.0 * w[k] / ws;
   g_sp.minRR = InpMinRR; g_sp.minRRMeanRev = InpMinRRMeanReversion; g_sp.rrTarget = InpRRTarget; g_sp.maxRR = InpMaxRR;
   g_sp.slBufferATR = InpSLBufferATR; g_sp.minSlATR = InpMinSLATR; g_sp.maxSlATR = InpMaxSLATR;
   g_sp.point = _Point;
   g_sp.warmup = InpWarmupBars;
   g_sp.enabled[XQ_TREND_PULLBACK] = InpEnableTrendPullback;
   g_sp.enabled[XQ_BREAKOUT] = InpEnableBreakout;
   g_sp.enabled[XQ_LIQ_SWEEP] = InpEnableLiquiditySweep;
   g_sp.enabled[XQ_REVERSAL] = InpEnableReversal;
   g_sp.enabled[XQ_MOMENTUM] = InpEnableMomentum;
   g_sp.enabled[XQ_MEAN_REVERSION] = InpEnableMeanReversion;
   if(!XQ_ParseRegimeMatrix(InpRegimeMatrix, g_sp))
     {
      g_log.Error("invalid InpRegimeMatrix: " + InpRegimeMatrix);
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpMinRR < 1.0 || InpMinSLATR <= 0 || InpMaxSLATR <= InpMinSLATR)
      return INIT_PARAMETERS_INCORRECT;

   //--- risk
   XQRiskParams rp;
   rp.riskPct = InpRiskPercent; rp.hardCapPct = InpMaxRiskPercentHard; rp.maxTotalRiskPct = InpMaxTotalRiskPercent;
   rp.maxPositions = InpMaxPositions; rp.maxTradesDay = InpMaxTradesPerDay;
   rp.dailyLossPct = InpDailyLossLimitPercent; rp.maxDDPct = InpMaxDrawdownPercent;
   rp.maxConsecLosses = InpMaxConsecutiveLosses; rp.cooldownBars = InpCooldownBarsAfterLoss;
   rp.reduceAfter = InpReduceRiskAfterLosses; rp.minMarginLevel = InpMinMarginLevelPercent;
   rp.commissionPerLotSide = InpCommissionPerLotSide; rp.slippagePoints = InpSlippageAllowancePoints;
   rp.closeOnDailyLimit = InpCloseOnDailyLimit;
   g_risk.Init(_Symbol, InpMagic, rp, InpResetHalt);
   if(g_risk.Halted())
      g_log.Error("EA is HALTED (" + g_risk.HaltReason() + "). Investigate, then restart with InpResetHalt=true.");
   g_maxPositions = g_guard.Netting() ? 1 : MathMax(1, InpMaxPositions);

   XQManageParams mp;
   mp.useBE = InpUseBreakEven; mp.beR = InpBreakEvenR;
   mp.usePartial = InpUsePartial; mp.partialR = InpPartialR; mp.partialFrac = InpPartialFraction;
   mp.useTrail = InpUseTrailing; mp.trailStartR = InpTrailStartR; mp.trailATR = InpTrailATRMult;
   mp.commissionPerLotSide = InpCommissionPerLotSide;
   mp.maxDeviationPoints = InpMaxDeviationPoints; mp.maxSlippagePoints = InpMaxSlippagePoints;
   g_trader.Init(_Symbol, InpMagic, mp, GetPointer(g_log), GetPointer(g_risk));

   //--- AI
   if(InpAIMode == XQ_AI_NATIVE || InpAIMode == XQ_AI_BRIDGE_FALLBACK)
     {
      if(g_model.Load(InpModelFile, true))
         g_log.Info(StringFormat("native model loaded (%s), threshold %.3f", InpModelFile, g_model.Threshold()));
      else
         g_log.Warn("native model NOT loaded: " + g_model.Error() + " -> degraded policy applies");
     }
   g_bridge.Init(InpBridgeTimeoutMs, InpBridgeHeartbeatMaxAge);
   if((InpAIMode == XQ_AI_BRIDGE || InpAIMode == XQ_AI_BRIDGE_FALLBACK) && MQLInfoInteger(MQL_TESTER))
      g_log.Warn("the Python bridge is not available in the Strategy Tester (native model or degraded policy used)");

   g_news.Init(GetPointer(g_tz), InpNewsBeforeMin, InpNewsAfterMin, InpNewsFomcMin, InpNewsCsv);
   g_log.Info("news source: " + g_news.Source());
   if(InpNewsFilter && !g_news.Available())
      g_log.Warn(MQLInfoInteger(MQL_TESTER) ? "no calendar CSV: news filter NOT applied in this test"
                 : "no calendar available: entries blocked while InpNewsUnavailableBlocks=true");

   LoadHistoryStats();
   g_dash.Init(InpShowDashboard && (!MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_VISUAL_MODE)));

   //--- small-account feasibility report with a typical stop (1.5 x ATR M5)
   if(g_m5.Load(_Symbol, PERIOD_M5, 300))
     {
      g_m5.Compute(InpSwingDepth, true);
      if(g_m5.n > 20)
         g_guard.SmallAccountReport(InpRiskPercent, InpMaxRiskPercentHard, 1.5 * g_m5.ATR());
     }
   EventSetMillisecondTimer(250);
   g_log.Info("mode " + ModeName() + " ready");
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   g_dash.Destroy();
   g_log.Info(StringFormat("deinit reason %d", reason));
  }

void OnTick(void)
  {
   if(g_risk.Halted())
      return;
   datetime m1 = iTime(_Symbol, PERIOD_M1, 0);
   if(m1 != g_lastM1)
     {
      g_lastM1 = m1;
      g_trader.Manage(g_atrM5);
     }
   datetime m5 = iTime(_Symbol, PERIOD_M5, 0);
   if(m5 != g_lastM5 && m5 > 0)
     {
      g_lastM5 = m5;
      long day = (long)TimeCurrent() / 86400;
      if(day != g_lastDay)
        {
         g_lastDay = day;
         g_trader.ResetDailyCounters();
        }
      OnNewM5Bar();
     }
   CheckBridge();
  }

void OnTimer(void)
  {
   CheckBridge();
   ulong now = GetTickCount64();
   if(now - g_lastDashMs >= 1000)
     {
      g_lastDashMs = now;
      if(g_guard.KillSwitch() && !g_risk.Halted())
        {
         g_log.Error("KILL SWITCH file detected: closing all positions and halting");
         g_trader.CloseAll("kill_switch");
         g_risk.Halt("kill switch file Common\\Files\\XQAI\\STOP");
        }
      string why;
      if(!g_risk.Halted() && g_risk.UpdateEquity(why))
        {
         g_log.Error("RISK LIMIT: " + why + " -> closing all positions");
         g_trader.CloseAll("risk_limit");
        }
      if(InpNewsFilter)
         g_news.Refresh(false);
      RefreshStatus();
      g_dash.Update(g_st);
     }
   if(now - g_lastStatusMs >= 5000)
     {
      g_lastStatusMs = now;
      g_dash.WriteStatus(g_st);
     }
  }

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;
   double pnl = 0, r = 0;
   string strat = "";
   int dir = 0;
   if(g_trader.OnDeal(trans.deal, pnl, r, strat, dir))
     {
      g_risk.OnClosed(pnl);
      g_nTrades++;
      g_totalPnl += pnl;
      if(pnl > 0)
        { g_nWins++; g_grossWin += pnl; }
      else
         g_grossLoss -= pnl;
      g_log.Info(StringFormat("position closed %s pnl=%.2f R=%.2f streak=%d", strat, pnl, r, g_risk.ConsecLosses()));
     }
  }

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
  {
   if(id != CHARTEVENT_OBJECT_CLICK)
      return;
   string what = g_dash.Clicked(sparam);
   if(what == "stop")
     {
      g_log.Error("manual STOP from the dashboard");
      g_trader.CloseAll("manual_stop");
      g_risk.Halt("manual stop button");
     }
   else
      if(what == "pause")
        {
         g_paused = !g_paused;
         g_log.Warn(g_paused ? "manual PAUSE (no new entries; open positions still managed)" : "manual RESUME");
        }
   RefreshStatus();
   g_dash.Update(g_st);
  }

double OnTester(void)
  {
   //--- custom optimisation criterion: same robust objective as python/xqai/validation.py
   double trades = TesterStatistics(STAT_TRADES);
   double ddPct = TesterStatistics(STAT_EQUITYDD_PERCENT);
   double expPayoff = TesterStatistics(STAT_EXPECTED_PAYOFF);
   if(trades < 30)
      return -10.0 + trades / 30.0;
   double avgLoss = TesterStatistics(STAT_GROSS_LOSS) / MathMax(1.0, TesterStatistics(STAT_LOSS_TRADES));
   double expR = (avgLoss != 0) ? expPayoff / MathAbs(avgLoss) : 0.0;     // expectancy in units of average loss
   return expR * MathSqrt(trades) - 0.05 * ddPct;
  }
//+------------------------------------------------------------------+
