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
   //--- idea-level ("group") metas: one trade idea may be split into several legs (staggered entries)
   string            GKey(const ulong g, const string f) { return StringFormat("XQG_%I64d_%I64u_%s", m_magic, g, f); }
   double            GMeta(const ulong g, const string f, const double def)
     {
      string k = GKey(g, f);
      return GlobalVariableCheck(k) ? GlobalVariableGet(k) : def;
     }
   void              SetGMeta(const ulong g, const string f, const double v) { GlobalVariableSet(GKey(g, f), v); }

   bool              OurOrderSelected(void)
     {
      return (OrderGetString(ORDER_SYMBOL) == m_sym && OrderGetInteger(ORDER_MAGIC) == m_magic);
     }
   bool              OurPositionSelected(void)
     {
      return (PositionGetString(POSITION_SYMBOL) == m_sym && PositionGetInteger(POSITION_MAGIC) == m_magic);
     }
   ulong             GroupOf(const ulong tk) { return (ulong)Meta(tk, "grp", (double)tk); }

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

   //--- number of open trade IDEAS (a staggered idea = several legs/orders = one idea)
   int               Count(int &dirOut, bool &allProtected)
     {
      ulong seen[];
      int n = 0;
      dirOut = 0;
      allProtected = true;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk == 0 || !OurPositionSelected())
            continue;
         int d = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
         dirOut = (dirOut == 0 || dirOut == d) ? d : 99;      // 99 = mixed (should never happen)
         double open = PositionGetDouble(POSITION_PRICE_OPEN), sl = PositionGetDouble(POSITION_SL);
         if(sl <= 0 || (sl - open) * d < 0)
            allProtected = false;
         AddUnique(seen, n, GroupOf(tk));
        }
      for(int i = OrdersTotal() - 1; i >= 0; i--)
        {
         ulong tk = OrderGetTicket(i);
         if(tk == 0 || !OurOrderSelected())
            continue;
         long ot = OrderGetInteger(ORDER_TYPE);
         int d = (ot == ORDER_TYPE_BUY_LIMIT || ot == ORDER_TYPE_BUY_STOP) ? 1 : -1;
         dirOut = (dirOut == 0 || dirOut == d) ? d : 99;
         allProtected = false;                              // an unfilled leg still carries risk
         AddUnique(seen, n, GroupOf(tk));
        }
      return n;
     }

   void              AddUnique(ulong &arr[], int &n, const ulong v)
     {
      for(int k = 0; k < n; k++)
         if(arr[k] == v)
            return;
      ArrayResize(arr, n + 1);
      arr[n] = v;
      n++;
     }

   bool              GroupHasPosition(const ulong g)
     {
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk != 0 && OurPositionSelected() && GroupOf(tk) == g)
            return true;
        }
      return false;
     }

   //--- deletes the unfilled limit orders of a group (g = 0: all of ours)
   void              DeletePending(const ulong g, const string reason)
     {
      for(int i = OrdersTotal() - 1; i >= 0; i--)
        {
         ulong tk = OrderGetTicket(i);
         if(tk == 0 || !OurOrderSelected())
            continue;
         if(g != 0 && GroupOf(tk) != g)
            continue;
         double vol = OrderGetDouble(ORDER_VOLUME_CURRENT), px = OrderGetDouble(ORDER_PRICE_OPEN);
         if(m_trade.OrderDelete(tk))
           {
            m_log.Trade("CANCEL", tk, XQ_StrategyName((int)Meta(tk, "st", 0)), 0, vol, px, 0, 0, 0, 0, reason);
            DelMeta(tk);
           }
        }
     }

   //--- expiry of unfilled legs, and cleanup when the idea has no open position any more
   void              ManagePending(void)
     {
      for(int i = OrdersTotal() - 1; i >= 0; i--)
        {
         ulong tk = OrderGetTicket(i);
         if(tk == 0 || !OurOrderSelected())
            continue;
         ulong g = GroupOf(tk);
         string why = "";
         if(TimeCurrent() >= (datetime)(long)Meta(tk, "exp", 0))
            why = "expired";
         else
            if(!GroupHasPosition(g))
               why = "idea_closed";
         double vol = OrderGetDouble(ORDER_VOLUME_CURRENT), px = OrderGetDouble(ORDER_PRICE_OPEN);
         if(why != "" && m_trade.OrderDelete(tk))
           {
            m_log.Trade("CANCEL", tk, XQ_StrategyName((int)Meta(tk, "st", 0)), 0, vol, px, 0, 0, 0, 0, why);
            DelMeta(tk);
           }
        }
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
      SetMeta(ticket, "grp", (double)ticket);          // the market leg names the idea
      SetMeta(ticket, "refE", entry);
      SetMeta(ticket, "refR", MathAbs(entry - sl));
      SetGMeta(ticket, "rm", riskMoney);
      SetGMeta(ticket, "pnl", 0.0);
      SetGMeta(ticket, "st", c.strategy);
      m_log.Trade("OPEN", ticket, XQ_StrategyName(c.strategy), dir, lots, entry, sl, tp, 0.0, 0.0,
                  StringFormat("score=%.1f slip=%.0fpts", c.score, slip));
      return ticket;
     }

   //--- total money at risk of the whole idea (all legs filled, SL hit)
   void              SetGroupRisk(const ulong g, const double riskMoney) { SetGMeta(g, "rm", riskMoney); }

   //--- additional leg of a staggered entry: limit order sharing the idea's SL and TP
   bool              PlaceLimit(const XQCandidate &c, const double price, const double lots, const ulong g,
                                const double refE, const double refR, const datetime expiry, const string comment)
     {
      MqlTick tick;
      if(!SymbolInfoTick(m_sym, tick))
         return false;
      double point = SymbolInfoDouble(m_sym, SYMBOL_POINT);
      double lvl = (double)SymbolInfoInteger(m_sym, SYMBOL_TRADE_STOPS_LEVEL) * point;
      int d = c.dir;
      double px = Norm(price), sl = Norm(c.sl), tp = Norm(c.tp);
      //--- a buy limit must sit below the ask, a sell limit above the bid, both with a valid stop distance
      bool okPrice = (d == 1) ? (tick.ask - px >= lvl && px - sl > lvl) : (px - tick.bid >= lvl && sl - px > lvl);
      if(!okPrice)
         return false;
      bool ok = (d == 1) ? m_trade.BuyLimit(lots, px, m_sym, sl, tp, ORDER_TIME_GTC, 0, comment)
                         : m_trade.SellLimit(lots, px, m_sym, sl, tp, ORDER_TIME_GTC, 0, comment);
      if(!ok || (m_trade.ResultRetcode() != TRADE_RETCODE_DONE && m_trade.ResultRetcode() != TRADE_RETCODE_PLACED))
        {
         m_log.Warn(StringFormat("limit leg refused: %s", m_trade.ResultRetcodeDescription()));
         return false;
        }
      ulong tk = m_trade.ResultOrder();             // hedging: the filled position keeps this ticket
      SetMeta(tk, "r0", MathAbs(px - sl));
      SetMeta(tk, "v0", lots);
      SetMeta(tk, "st", c.strategy);
      SetMeta(tk, "ext", refE);
      SetMeta(tk, "pnl", 0.0);
      SetMeta(tk, "grp", (double)g);
      SetMeta(tk, "refE", refE);
      SetMeta(tk, "refR", refR);
      SetMeta(tk, "exp", (double)expiry);
      m_log.Trade("LIMIT", tk, XQ_StrategyName(c.strategy), d, lots, px, sl, tp, 0, 0, comment);
      return true;
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
      DeletePending(0, reason);
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
         if(tk == 0 || !OurPositionSelected())
            continue;
         int d = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
         double open = PositionGetDouble(POSITION_PRICE_OPEN);
         double sl = PositionGetDouble(POSITION_SL), tp = PositionGetDouble(POSITION_TP);
         double vol = PositionGetDouble(POSITION_VOLUME);
         double r0 = Meta(tk, "refR", Meta(tk, "r0", MathAbs(open - sl)));   // idea risk (first entry -> SL)
         double refE = Meta(tk, "refE", open);
         double v0 = Meta(tk, "v0", vol);
         if(r0 <= 0)
            continue;
         double px = (d == 1) ? tick.bid : tick.ask;       // price at which the position would close
         double ext = Meta(tk, "ext", open);
         ext = (d == 1) ? MathMax(ext, px) : MathMin(ext, px);
         SetMeta(tk, "ext", ext);
         double fav = (ext - refE) * d;
         //--- the move is under way: unfilled legs of this idea are no longer wanted
         if(fav >= m_p.partialR * r0)
           {
            DeletePending(GroupOf(tk), "move_started");
            if(!PositionSelectByTicket(tk))
               continue;
           }
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
      strategy = XQ_StrategyName((int)Meta(pos, "st", 0));
      string why = "";
      long reasonCode = HistoryDealGetInteger(deal, DEAL_REASON);
      if(reasonCode == DEAL_REASON_SL)
         why = (acc < 0) ? "stop_loss" : "protected_stop";
      else
         if(reasonCode == DEAL_REASON_TP)
            why = "take_profit";
         else
            why = "market_close";
      m_log.Trade("CLOSE", pos, strategy, dir, HistoryDealGetDouble(deal, DEAL_VOLUME),
                  HistoryDealGetDouble(deal, DEAL_PRICE), 0, 0, acc, (rm > 0) ? acc / rm : 0.0, why);
      //--- idea accounting: the idea ends when none of its legs is open
      ulong g = GroupOf(pos);
      double gpnl = GMeta(g, "pnl", 0.0) + acc;
      SetGMeta(g, "pnl", gpnl);
      DelMeta(pos);
      if(GroupHasPosition(g))
         return false;
      DeletePending(g, "idea_closed");
      double grm = GMeta(g, "rm", rm);
      posPnl = gpnl;
      posR = (grm > 0) ? gpnl / grm : 0.0;
      GlobalVariablesDeleteAll(StringFormat("XQG_%I64d_%I64u_", m_magic, g));
      return true;
     }
  };

#endif
