//+------------------------------------------------------------------+
//| Trader.mqh - order execution and position management             |
//| * every order carries a stop loss, checked with OrderCheck()     |
//| * stops/freeze levels and tick size respected                    |
//| * slippage measured on every fill                                |
//| * SL is only ever moved in the direction that REDUCES risk       |
//+------------------------------------------------------------------+
#ifndef XQAI_TRADER_MQH
#define XQAI_TRADER_MQH

#include <Trade\Trade.mqh>
#include "Defines.mqh"
#include "Logger.mqh"
#include "RiskManager.mqh"

struct XQManageParams
  {
   bool              useBE;   double beR;
   bool              usePartial; double partialR, partialFrac;
   bool              useTrail; double trailStartR, trailATR;
   double            commissionPerLotSide;
   int               maxDeviationPoints, maxSlippagePoints;
  };

class CTrader
  {
private:
   CTrade            m_trade;
   string            m_sym, m_pre;
   long              m_magic;
   XQManageParams    m_p;
   CLogger          *m_log;
   CRiskManager     *m_risk;
   int               m_consecFailures;
   int               m_slippageEvents;

   string            Key(const ulong tk, const string f) { return StringFormat("%s%I64u_%s", m_pre, tk, f); }
   double            Meta(const ulong tk, const string f, const double def)
     {
      string k = Key(tk, f);
      return GlobalVariableCheck(k) ? GlobalVariableGet(k) : def;
     }
   void              SetMeta(const ulong tk, const string f, const double v) { GlobalVariableSet(Key(tk, f), v); }
   void              DelMeta(const ulong tk) { GlobalVariablesDeleteAll(StringFormat("%s%I64u_", m_pre, tk)); }

   double            TickSize(void)
     {
      double ts = SymbolInfoDouble(m_sym, SYMBOL_TRADE_TICK_SIZE);
      return (ts > 0) ? ts : SymbolInfoDouble(m_sym, SYMBOL_POINT);
     }

   ENUM_ORDER_TYPE_FILLING Filling(void)
     {
      long fm = SymbolInfoInteger(m_sym, SYMBOL_FILLING_MODE);
      if((fm & SYMBOL_FILLING_FOK) == SYMBOL_FILLING_FOK)
         return ORDER_FILLING_FOK;
      if((fm & SYMBOL_FILLING_IOC) == SYMBOL_FILLING_IOC)
         return ORDER_FILLING_IOC;
      return ORDER_FILLING_RETURN;
     }

public:
                     CTrader(void) : m_magic(0), m_log(NULL), m_risk(NULL), m_consecFailures(0), m_slippageEvents(0) {}

   void              Init(const string sym, const long magic, const XQManageParams &p, CLogger *log, CRiskManager *risk)
     {
      m_sym = sym;
      m_magic = magic;
      m_p = p;
      m_log = log;
      m_risk = risk;
      m_pre = StringFormat("XQP_%I64d_", magic);
      m_trade.SetExpertMagicNumber((ulong)magic);
      m_trade.SetDeviationInPoints((ulong)p.maxDeviationPoints);
      m_trade.SetTypeFillingBySymbol(sym);
      m_trade.SetMarginMode();
      m_trade.LogLevel(LOG_LEVEL_ERRORS);
     }

   int               ConsecFailures(void) const { return m_consecFailures; }
   int               SlippageEvents(void) const { return m_slippageEvents; }
   void              ResetDailyCounters(void) { m_slippageEvents = 0; }

   double            Norm(const double price)
     {
      double ts = TickSize();
      int digits = (int)SymbolInfoInteger(m_sym, SYMBOL_DIGITS);
      return NormalizeDouble(MathRound(price / ts) * ts, digits);
     }

   //--- our positions on this symbol
   int               Count(int &dirOut, bool &allProtected)
     {
      int n = 0;
      dirOut = 0;
      allProtected = true;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk == 0 || PositionGetString(POSITION_SYMBOL) != m_sym || PositionGetInteger(POSITION_MAGIC) != m_magic)
            continue;
         n++;
         int d = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
         dirOut = (dirOut == 0 || dirOut == d) ? d : 99;      // 99 = mixed (should never happen)
         double open = PositionGetDouble(POSITION_PRICE_OPEN), sl = PositionGetDouble(POSITION_SL);
         if(sl <= 0 || (sl - open) * d < 0)
            allProtected = false;
        }
      return n;
     }

   //--- validates stops against the broker's stop level for the current price
   bool              StopsValid(const int dir, const double sl, const double tp, string &why)
     {
      MqlTick tick;
      if(!SymbolInfoTick(m_sym, tick))
        { why = "no_tick"; return false; }
      double point = SymbolInfoDouble(m_sym, SYMBOL_POINT);
      double lvl = (double)SymbolInfoInteger(m_sym, SYMBOL_TRADE_STOPS_LEVEL) * point;
      if(dir == 1)
        {
         if(tick.bid - sl < lvl || tp - tick.bid < lvl || sl >= tick.bid)
           { why = "stops_level"; return false; }
        }
      else
        {
         if(sl - tick.ask < lvl || tick.ask - tp < lvl || sl <= tick.ask)
           { why = "stops_level"; return false; }
        }
      return true;
     }

   //--- market order with SL/TP; returns position ticket or 0
   ulong             Open(const XQCandidate &c, const double lots, const double riskMoney, const string comment)
     {
      MqlTick tick;
      if(!SymbolInfoTick(m_sym, tick))
         return 0;
      int dir = c.dir;
      double price = (dir == 1) ? tick.ask : tick.bid;
      double sl = Norm(c.sl), tp = Norm(c.tp);
      string why;
      if(!StopsValid(dir, sl, tp, why))
        {
         m_log.Warn("order refused before sending: " + why);
         return 0;
        }
      //--- broker-side validation without sending
      MqlTradeRequest req;
      MqlTradeCheckResult chk;
      ZeroMemory(req);
      ZeroMemory(chk);
      req.action = TRADE_ACTION_DEAL;
      req.symbol = m_sym;
      req.volume = lots;
      req.type = (dir == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      req.price = price;
      req.sl = sl;
      req.tp = tp;
      req.deviation = (ulong)m_p.maxDeviationPoints;
      req.magic = (ulong)m_magic;
      req.type_filling = Filling();
      if(!OrderCheck(req, chk))
        {
         m_log.Warn(StringFormat("OrderCheck failed retcode=%u %s", chk.retcode, chk.comment));
         m_consecFailures++;
         return 0;
        }
      bool ok = (dir == 1) ? m_trade.Buy(lots, m_sym, price, sl, tp, comment)
                           : m_trade.Sell(lots, m_sym, price, sl, tp, comment);
      uint rc = m_trade.ResultRetcode();
      if(!ok || (rc != TRADE_RETCODE_DONE && rc != TRADE_RETCODE_DONE_PARTIAL && rc != TRADE_RETCODE_PLACED))
        {
         m_consecFailures++;
         m_log.Error(StringFormat("order failed retcode=%u %s", rc, m_trade.ResultRetcodeDescription()));
         return 0;
        }
      m_consecFailures = 0;
      ulong ticket = m_trade.ResultOrder();      // hedging: position ticket = opening order ticket
      double fill = m_trade.ResultPrice();
      if(fill <= 0 && PositionSelectByTicket(ticket))
         fill = PositionGetDouble(POSITION_PRICE_OPEN);
      double point = SymbolInfoDouble(m_sym, SYMBOL_POINT);
      double slip = (fill > 0) ? (fill - price) * dir / point : 0.0;
      if(slip > m_p.maxSlippagePoints)
        {
         m_slippageEvents++;
         m_log.Warn(StringFormat("adverse slippage %.0f points on ticket %I64u", slip, ticket));
        }
      double entry = (fill > 0) ? fill : price;
      SetMeta(ticket, "r0", MathAbs(entry - sl));
      SetMeta(ticket, "v0", lots);
      SetMeta(ticket, "st", c.strategy);
      SetMeta(ticket, "ext", entry);
      SetMeta(ticket, "rm", riskMoney);
      SetMeta(ticket, "pnl", 0.0);
      SetMeta(ticket, "t0", (double)TimeCurrent());
      m_log.Trade("OPEN", ticket, XQ_StrategyName(c.strategy), dir, lots, entry, sl, tp, 0.0, 0.0,
                  StringFormat("score=%.1f slip=%.0fpts", c.score, slip));
      return ticket;
     }

   bool              Close(const ulong ticket, const string reason)
     {
      if(!PositionSelectByTicket(ticket))
         return false;
      bool ok = m_trade.PositionClose(ticket, (ulong)m_p.maxDeviationPoints);
      if(!ok)
        {
         m_consecFailures++;
         m_log.Error(StringFormat("close %I64u failed: %s", ticket, m_trade.ResultRetcodeDescription()));
         return false;
        }
      m_log.Info(StringFormat("closed %I64u (%s)", ticket, reason));
      return true;
     }

   void              CloseAll(const string reason)
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk == 0 || PositionGetString(POSITION_SYMBOL) != m_sym || PositionGetInteger(POSITION_MAGIC) != m_magic)
            continue;
         Close(tk, reason);
        }
     }

   //--- break-even, partial take profit and ATR trailing (called on every new M1 bar)
   void              Manage(const double atrM5)
     {
      MqlTick tick;
      if(!SymbolInfoTick(m_sym, tick))
         return;
      double point = SymbolInfoDouble(m_sym, SYMBOL_POINT);
      double stopsLvl = (double)SymbolInfoInteger(m_sym, SYMBOL_TRADE_STOPS_LEVEL) * point;
      double freezeLvl = (double)SymbolInfoInteger(m_sym, SYMBOL_TRADE_FREEZE_LEVEL) * point;
      double spread = tick.ask - tick.bid;
      double contract = SymbolInfoDouble(m_sym, SYMBOL_TRADE_CONTRACT_SIZE);
      double vmin = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_MIN), vstep = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_STEP);
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk == 0 || PositionGetString(POSITION_SYMBOL) != m_sym || PositionGetInteger(POSITION_MAGIC) != m_magic)
            continue;
         int d = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
         double open = PositionGetDouble(POSITION_PRICE_OPEN);
         double sl = PositionGetDouble(POSITION_SL), tp = PositionGetDouble(POSITION_TP);
         double vol = PositionGetDouble(POSITION_VOLUME);
         double r0 = Meta(tk, "r0", MathAbs(open - sl));
         double v0 = Meta(tk, "v0", vol);
         if(r0 <= 0)
            continue;
         double px = (d == 1) ? tick.bid : tick.ask;       // price at which the position would close
         double ext = Meta(tk, "ext", open);
         ext = (d == 1) ? MathMax(ext, px) : MathMin(ext, px);
         SetMeta(tk, "ext", ext);
         double fav = (ext - open) * d;
         //--- partial take profit
         if(m_p.usePartial && Meta(tk, "pt", 0) < 0.5 && fav >= m_p.partialR * r0)
           {
            double part = MathFloor(v0 * m_p.partialFrac / vstep + 1e-9) * vstep;
            if(part >= vmin && vol - part >= vmin - 1e-9)
              {
               if(m_trade.PositionClosePartial(tk, part, (ulong)m_p.maxDeviationPoints))
                  m_log.Trade("PARTIAL", tk, XQ_StrategyName((int)Meta(tk, "st", 0)), d, part, px, sl, tp, 0, 0, "partial_r");
              }
            SetMeta(tk, "pt", 1);
           }
         //--- candidate new stop (only tighter)
         double newSl = sl;
         if(m_p.useBE && Meta(tk, "be", 0) < 0.5 && fav >= m_p.beR * r0)
           {
            double be = open + d * (spread + (contract > 0 ? 2.0 * m_p.commissionPerLotSide / contract : 0.0));
            if((be - newSl) * d > 0 || newSl <= 0)
               newSl = be;
            SetMeta(tk, "be", 1);
           }
         if(m_p.useTrail && fav >= m_p.trailStartR * r0 && atrM5 > 0)
           {
            double trail = ext - d * m_p.trailATR * atrM5;
            if((trail - newSl) * d > 0)
               newSl = trail;
           }
         newSl = Norm(newSl);
         bool improves = (sl <= 0) || ((newSl - sl) * d > TickSize() * 0.5);
         bool roomOk = (px - newSl) * d > MathMax(stopsLvl, 0.0) + spread;
         bool notFrozen = (sl <= 0) || MathAbs(px - sl) > freezeLvl;
         if(improves && roomOk && notFrozen)
           {
            if(m_trade.PositionModify(tk, newSl, tp))
               m_log.Trade("MODIFY", tk, XQ_StrategyName((int)Meta(tk, "st", 0)), d, vol, px, newSl, tp, 0, 0,
                           (Meta(tk, "be", 0) > 0.5 && fav < m_p.trailStartR * r0) ? "break_even" : "trailing");
            else
               m_log.Warn(StringFormat("modify %I64u failed: %s", tk, m_trade.ResultRetcodeDescription()));
           }
        }
     }

   //--- exits decided at the open of a new M5 bar (same rules as backtester.py)
   void              BarExits(const int structBreakDir, const bool chochOnLastBar, const int oppDir, const double oppScore,
                              const double oppThreshold, const bool useStructExit, const int maxHoldBars,
                              const bool weekendClose)
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk == 0 || PositionGetString(POSITION_SYMBOL) != m_sym || PositionGetInteger(POSITION_MAGIC) != m_magic)
            continue;
         int d = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
         datetime t0 = (datetime)PositionGetInteger(POSITION_TIME);
         string reason = "";
         if(useStructExit && chochOnLastBar && structBreakDir == -d)
            reason = "structure_invalidation";
         else
            if(oppDir == -d && oppScore >= oppThreshold)
               reason = "opposite_signal";
            else
               if(TimeCurrent() - t0 >= (long)maxHoldBars * 300)
                  reason = "time_stop";
               else
                  if(weekendClose)
                     reason = "weekend";
         if(reason != "")
            Close(tk, reason);
        }
     }

   //--- called from OnTradeTransaction for each new deal; returns true when a position is fully closed
   bool              OnDeal(const ulong deal, double &posPnl, double &posR, string &strategy, int &dir)
     {
      if(!HistoryDealSelect(deal))
         return false;
      if(HistoryDealGetString(deal, DEAL_SYMBOL) != m_sym || HistoryDealGetInteger(deal, DEAL_MAGIC) != m_magic)
         return false;
      long entry = HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT)
         return false;
      ulong pos = (ulong)HistoryDealGetInteger(deal, DEAL_POSITION_ID);
      double pnl = HistoryDealGetDouble(deal, DEAL_PROFIT) + HistoryDealGetDouble(deal, DEAL_COMMISSION)
                   + HistoryDealGetDouble(deal, DEAL_SWAP);
      double acc = Meta(pos, "pnl", 0.0) + pnl;
      SetMeta(pos, "pnl", acc);
      if(PositionSelectByTicket(pos))
         return false;                      // partial close: position still open
      //--- add the opening commission (charged on the entry deal)
      if(HistorySelectByPosition(pos))
         for(int k = 0; k < HistoryDealsTotal(); k++)
           {
            ulong dk = HistoryDealGetTicket(k);
            if(HistoryDealGetInteger(dk, DEAL_ENTRY) == DEAL_ENTRY_IN)
              {
               acc += HistoryDealGetDouble(dk, DEAL_COMMISSION);
               dir = (HistoryDealGetInteger(dk, DEAL_TYPE) == DEAL_TYPE_BUY) ? 1 : -1;
              }
           }
      double rm = Meta(pos, "rm", 0.0);
      posPnl = acc;
      posR = (rm > 0) ? acc / rm : 0.0;
      strategy = XQ_StrategyName((int)Meta(pos, "st", 0));
      string why = "";
      long reasonCode = HistoryDealGetInteger(deal, DEAL_REASON);
      if(reasonCode == DEAL_REASON_SL)
         why = (posPnl < 0) ? "stop_loss" : "protected_stop";
      else
         if(reasonCode == DEAL_REASON_TP)
            why = "take_profit";
         else
            why = "market_close";
      m_log.Trade("CLOSE", pos, strategy, dir, HistoryDealGetDouble(deal, DEAL_VOLUME),
                  HistoryDealGetDouble(deal, DEAL_PRICE), 0, 0, posPnl, posR, why);
      DelMeta(pos);
      return true;
     }
  };

#endif
