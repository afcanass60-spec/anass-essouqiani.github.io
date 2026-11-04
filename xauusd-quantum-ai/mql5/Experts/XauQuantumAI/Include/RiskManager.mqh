//+------------------------------------------------------------------+
//| RiskManager.mqh - lot sizing and account-level risk guards       |
//| Mirror of python/xqai/risk.py + guards of backtester.py          |
//| The lot depends ONLY on equity, risk %, SL distance and the      |
//| broker contract (OrderCalcProfit / OrderCalcMargin). It is never |
//| increased after a loss (no martingale): only halved after a      |
//| losing streak.  State is persisted in terminal GlobalVariables.  |
//+------------------------------------------------------------------+
#ifndef XQAI_RISKMANAGER_MQH
#define XQAI_RISKMANAGER_MQH

#include "Defines.mqh"

struct XQRiskParams
  {
   double            riskPct, hardCapPct, maxTotalRiskPct;
   int               maxPositions, maxTradesDay;
   double            dailyLossPct, maxDDPct;
   int               maxConsecLosses, cooldownBars, reduceAfter;
   double            minMarginLevel, commissionPerLotSide;
   int               slippagePoints;
   bool              closeOnDailyLimit;
  };

class CRiskManager
  {
private:
   XQRiskParams      m_p;
   string            m_sym, m_pre;
   long              m_magic;
   //--- persisted state
   long              m_dayKey;
   double            m_dayStartEq, m_peakEq;
   bool              m_halted;
   string            m_haltReason;
   int               m_consec, m_tradesToday;
   datetime          m_lastLoss;
   bool              m_dayBlocked;

   double            GV(const string k, const double def)
     {
      string n = m_pre + k;
      if(GlobalVariableCheck(n))
         return GlobalVariableGet(n);
      return def;
     }
   void              SetGV(const string k, const double v) { GlobalVariableSet(m_pre + k, v); }

   void              Save(void)
     {
      SetGV("day", (double)m_dayKey);
      SetGV("dayeq", m_dayStartEq);
      SetGV("peak", m_peakEq);
      SetGV("halt", m_halted ? 1.0 : 0.0);
      SetGV("consec", m_consec);
      SetGV("ntoday", m_tradesToday);
      SetGV("lastloss", (double)m_lastLoss);
      SetGV("dayblk", m_dayBlocked ? 1.0 : 0.0);
     }

public:
                     CRiskManager(void) : m_magic(0), m_dayKey(0), m_dayStartEq(0), m_peakEq(0), m_halted(false),
                     m_consec(0), m_tradesToday(0), m_lastLoss(0), m_dayBlocked(false) {}

   void              Init(const string symbol, const long magic, const XQRiskParams &p, const bool resetHalt)
     {
      m_sym = symbol;
      m_magic = magic;
      m_p = p;
      m_pre = StringFormat("XQAI_%I64d_%I64d_", AccountInfoInteger(ACCOUNT_LOGIN), magic);
      if(MQLInfoInteger(MQL_TESTER))
         GlobalVariablesDeleteAll(m_pre);
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      m_dayKey = (long)GV("day", 0);
      m_dayStartEq = GV("dayeq", eq);
      m_peakEq = MathMax(GV("peak", eq), eq);
      m_halted = GV("halt", 0) > 0.5;
      m_consec = (int)GV("consec", 0);
      m_tradesToday = (int)GV("ntoday", 0);
      m_lastLoss = (datetime)(long)GV("lastloss", 0);
      m_dayBlocked = GV("dayblk", 0) > 0.5;
      if(m_halted)
         m_haltReason = "halt persisted from a previous session";
      if(resetHalt && m_halted)
        {
         m_halted = false;
         m_peakEq = eq;              // new reference after a manual, explicit reset
         m_haltReason = "";
        }
      UpdateDay();
      Save();
     }

   //--- server-day rollover
   void              UpdateDay(void)
     {
      long key = (long)TimeCurrent() / 86400;
      if(key != m_dayKey)
        {
         m_dayKey = key;
         m_dayStartEq = AccountInfoDouble(ACCOUNT_EQUITY);
         m_tradesToday = 0;
         m_dayBlocked = false;
         Save();
        }
     }

   //--- returns true if a hard limit was hit and positions must be closed
   bool              UpdateEquity(string &why)
     {
      why = "";
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      if(eq > m_peakEq)
        {
         m_peakEq = eq;
         SetGV("peak", m_peakEq);
        }
      double dd = (m_peakEq > 0) ? 100.0 * (m_peakEq - eq) / m_peakEq : 0.0;
      if(m_p.maxDDPct > 0 && dd >= m_p.maxDDPct && !m_halted)
        {
         m_halted = true;
         m_haltReason = StringFormat("max drawdown %.2f%% >= %.2f%%", dd, m_p.maxDDPct);
         Save();
         why = m_haltReason;
         return true;
        }
      if(!m_dayBlocked && m_dayStartEq > 0 && eq <= m_dayStartEq * (1.0 - m_p.dailyLossPct / 100.0))
        {
         m_dayBlocked = true;
         Save();
         why = StringFormat("daily loss limit %.2f%% reached", m_p.dailyLossPct);
         return m_p.closeOnDailyLimit;
        }
      return false;
     }

   void              Halt(const string reason)
     {
      m_halted = true;
      m_haltReason = reason;
      Save();
     }

   bool              Halted(void) const { return m_halted; }
   string            HaltReason(void) const { return m_haltReason; }
   bool              DayBlocked(void) const { return m_dayBlocked; }
   int               TradesToday(void) const { return m_tradesToday; }
   int               ConsecLosses(void) const { return m_consec; }
   double            DayStartEquity(void) const { return m_dayStartEq; }
   double            PeakEquity(void) const { return m_peakEq; }
   double            DrawdownPct(void) const
     {
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      return (m_peakEq > 0) ? 100.0 * (m_peakEq - eq) / m_peakEq : 0.0;
     }

   //--- account-level gates (in the same order as backtester.py)
   bool              CanOpen(string &reason)
     {
      if(m_halted)
        { reason = "halted:" + m_haltReason; return false; }
      double eq = AccountInfoDouble(ACCOUNT_EQUITY);
      if(m_dayBlocked || (m_dayStartEq > 0 && eq <= m_dayStartEq * (1.0 - m_p.dailyLossPct / 100.0)))
        { m_dayBlocked = true; reason = "daily_loss_limit"; return false; }
      long today = (long)TimeCurrent() / 86400;
      if(m_consec >= m_p.maxConsecLosses && (long)m_lastLoss / 86400 == today)
        { reason = "consecutive_losses"; return false; }
      if(TimeCurrent() - m_lastLoss < m_p.cooldownBars * 300)
        { reason = "cooldown"; return false; }
      if(m_tradesToday >= m_p.maxTradesDay)
        { reason = "max_trades_day"; return false; }
      reason = "";
      return true;
     }

   //--- money lost if price goes from 'open' to 'sl' with 'lots' (positive number), -1 on error
   double            LossAt(const int dir, const double lots, const double open, const double sl)
     {
      double pl = 0.0;
      ENUM_ORDER_TYPE type = (dir == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      if(!OrderCalcProfit(type, m_sym, lots, open, sl, pl))
         return -1.0;
      return -pl;
     }

   //--- position size; returns lots (0 = refused) with the reason and the money at risk
   double            Size(const int dir, const double entry, const double sl, double &riskMoney, double &riskPct,
                          string &reason)
     {
      reason = "";
      riskMoney = 0;
      riskPct = 0;
      double bal = AccountInfoDouble(ACCOUNT_BALANCE), eq = AccountInfoDouble(ACCOUNT_EQUITY);
      double capital = MathMin(bal, eq);
      if(capital <= 0)
        { reason = "no_capital"; return 0; }
      double mult = (m_p.reduceAfter > 0 && m_consec >= m_p.reduceAfter) ? 0.5 : 1.0;
      double budget = capital * m_p.riskPct / 100.0 * mult;
      double point = SymbolInfoDouble(m_sym, SYMBOL_POINT);
      double slAdj = sl - dir * m_p.slippagePoints * point;
      double lossPerLot = LossAt(dir, 1.0, entry, slAdj);
      if(lossPerLot <= 0)
        { reason = "loss_calc_failed"; return 0; }
      lossPerLot += 2.0 * m_p.commissionPerLotSide;
      double vmin = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_MIN);
      double vmax = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_MAX);
      double vstep = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_STEP);
      double vlimit = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_LIMIT);
      if(vstep <= 0)
        { reason = "bad_volume_step"; return 0; }
      double lots = MathFloor(budget / lossPerLot / vstep + 1e-9) * vstep;
      lots = MathMin(lots, vmax);
      if(vlimit > 0)
         lots = MathMin(lots, vlimit);
      if(lots < vmin - 1e-12)
        {
         double minRisk = vmin * lossPerLot;
         if(minRisk > capital * m_p.hardCapPct / 100.0)
           {
            riskMoney = minRisk;
            riskPct = 100.0 * minRisk / capital;
            reason = "min_lot_risk_exceeds_cap";
            return 0;
           }
         lots = vmin;
        }
      int digits = (int)MathMax(0, MathCeil(-MathLog10(vstep) - 1e-9));
      lots = NormalizeDouble(lots, digits);
      riskMoney = lots * lossPerLot;
      riskPct = 100.0 * riskMoney / capital;
      //--- margin
      double margin = 0.0;
      ENUM_ORDER_TYPE type = (dir == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      if(!OrderCalcMargin(type, m_sym, lots, entry, margin))
        { reason = "margin_calc_failed"; return 0; }
      double free = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      if(margin > free)
        { reason = "insufficient_free_margin"; return 0; }
      double used = AccountInfoDouble(ACCOUNT_MARGIN);
      if(used + margin > 0 && 100.0 * eq / (used + margin) < m_p.minMarginLevel)
        { reason = "margin_level_limit"; return 0; }
      return lots;
     }

   //--- staggered entries sharing one SL: equal lots per leg, sized so that the TOTAL loss when all
   //--- legs are filled and the SL is hit equals the risk budget. Legs below the minimum lot are
   //--- dropped from the deepest one; with a single leg left the single-entry rules (hard cap) apply.
   //--- Mirror of python/xqai/risk.py::size_group.
   double            SizeGroup(const int dir, const double &levels[], const int nLevels, const double sl,
                               int &nUsed, double &riskMoney, double &riskPct, string &reason)
     {
      reason = "";
      nUsed = 0;
      riskMoney = 0;
      riskPct = 0;
      double bal = AccountInfoDouble(ACCOUNT_BALANCE), eq = AccountInfoDouble(ACCOUNT_EQUITY);
      double capital = MathMin(bal, eq);
      if(capital <= 0)
        { reason = "no_capital"; return 0; }
      double mult = (m_p.reduceAfter > 0 && m_consec >= m_p.reduceAfter) ? 0.5 : 1.0;
      double budget = capital * m_p.riskPct / 100.0 * mult;
      double point = SymbolInfoDouble(m_sym, SYMBOL_POINT);
      double slAdj = sl - dir * m_p.slippagePoints * point;
      double vmin = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_MIN), vmax = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_MAX);
      double vstep = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_STEP);
      if(vstep <= 0)
        { reason = "bad_volume_step"; return 0; }
      int digits = (int)MathMax(0, MathCeil(-MathLog10(vstep) - 1e-9));
      for(int n = nLevels; n >= 2; n--)
        {
         double lossEach = 0.0;                       // loss of 1 lot on EACH leg
         bool calcOk = true;
         for(int k = 0; k < n; k++)
           {
            double l1 = LossAt(dir, 1.0, levels[k], slAdj);
            if(l1 <= 0)
              { calcOk = false; break; }
            lossEach += l1 + 2.0 * m_p.commissionPerLotSide;
           }
         if(!calcOk)
           { reason = "loss_calc_failed"; return 0; }
         double lots = MathMin(MathFloor(budget / lossEach / vstep + 1e-9) * vstep, vmax);
         if(lots < vmin - 1e-12)
            continue;
         lots = NormalizeDouble(lots, digits);
         double margin = 0.0;
         ENUM_ORDER_TYPE type = (dir == 1) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
         if(!OrderCalcMargin(type, m_sym, lots * n, levels[0], margin))
           { reason = "margin_calc_failed"; return 0; }
         if(margin > AccountInfoDouble(ACCOUNT_MARGIN_FREE))
           { reason = "insufficient_free_margin"; return 0; }
         double used = AccountInfoDouble(ACCOUNT_MARGIN);
         if(100.0 * eq / (used + margin) < m_p.minMarginLevel)
           { reason = "margin_level_limit"; return 0; }
         nUsed = n;
         riskMoney = lots * lossEach;
         riskPct = 100.0 * riskMoney / capital;
         return lots;
        }
      double lots1 = Size(dir, levels[0], sl, riskMoney, riskPct, reason);
      nUsed = (lots1 > 0) ? 1 : 0;
      return lots1;
     }

   //--- total open risk (money to SL) of our positions and unfilled limit legs, not counting protected ones
   double            OpenRisk(void)
     {
      double total = 0.0;
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         ulong tk = PositionGetTicket(i);
         if(tk == 0 || PositionGetString(POSITION_SYMBOL) != m_sym || PositionGetInteger(POSITION_MAGIC) != m_magic)
            continue;
         int dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
         double open = PositionGetDouble(POSITION_PRICE_OPEN), sl = PositionGetDouble(POSITION_SL);
         if(sl <= 0)
           {
            total += 1e12;     // a position without stop is never acceptable: blocks any new risk
            continue;
           }
         if((open - sl) * dir > 0)
            total += MathMax(0.0, LossAt(dir, PositionGetDouble(POSITION_VOLUME), open, sl));
        }
      for(int i = OrdersTotal() - 1; i >= 0; i--)
        {
         ulong tk = OrderGetTicket(i);
         if(tk == 0 || OrderGetString(ORDER_SYMBOL) != m_sym || OrderGetInteger(ORDER_MAGIC) != m_magic)
            continue;
         long ot = OrderGetInteger(ORDER_TYPE);
         int dir = (ot == ORDER_TYPE_BUY_LIMIT || ot == ORDER_TYPE_BUY_STOP) ? 1 : -1;
         double open = OrderGetDouble(ORDER_PRICE_OPEN), sl = OrderGetDouble(ORDER_SL);
         if(sl <= 0)
           {
            total += 1e12;
            continue;
           }
         total += MathMax(0.0, LossAt(dir, OrderGetDouble(ORDER_VOLUME_CURRENT), open, sl));
        }
      return total;
     }

   bool              TotalRiskOk(const double newRisk, const bool hasPositions)
     {
      if(!hasPositions)
         return true;
      double capital = MathMin(AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY));
      return (100.0 * (OpenRisk() + newRisk) / MathMax(capital, 1e-9) <= m_p.maxTotalRiskPct + 1e-9);
     }

   void              OnOpened(void)
     {
      m_tradesToday++;
      Save();
     }

   void              OnClosed(const double pnl)
     {
      if(pnl < 0)
        {
         m_consec++;
         m_lastLoss = TimeCurrent();
        }
      else
         m_consec = 0;
      Save();
     }
  };

#endif
