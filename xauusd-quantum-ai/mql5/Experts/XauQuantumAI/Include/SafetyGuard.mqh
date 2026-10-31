//+------------------------------------------------------------------+
//| SafetyGuard.mqh - environment checks, mode enforcement,          |
//| anomaly detection and kill switch.                               |
//| Principle: any failed essential check => no new position.        |
//+------------------------------------------------------------------+
#ifndef XQAI_SAFETYGUARD_MQH
#define XQAI_SAFETYGUARD_MQH

#include "Defines.mqh"
#include "Logger.mqh"

#define XQ_LIVE_CONFIRM_PHRASE "I ACCEPT THE RISK OF REAL TRADING"

class CSafetyGuard
  {
private:
   string            m_sym;
   CLogger          *m_log;
   datetime          m_pauseUntil;
   string            m_pauseReason;
   bool              m_netting;

public:
                     CSafetyGuard(void) : m_log(NULL), m_pauseUntil(0), m_netting(false) {}

   bool              Netting(void) const { return m_netting; }

   //--- one-time checks at initialisation; returns false => INIT_FAILED
   bool              InitChecks(const string sym, CLogger *log, const ENUM_XQ_MODE mode, const string liveConfirm,
                                const long liveLogin, ENUM_XQ_MODE &effective)
     {
      m_sym = sym;
      m_log = log;
      bool tester = (bool)MQLInfoInteger(MQL_TESTER);
      long tradeMode = AccountInfoInteger(ACCOUNT_TRADE_MODE);
      long login = AccountInfoInteger(ACCOUNT_LOGIN);
      effective = mode;
      //--- symbol must be gold vs USD (any broker suffix accepted: XAUUSD, XAUUSD.r, XAUUSDm, GOLD is refused)
      string u = sym;
      StringToUpper(u);
      if(StringFind(u, "XAU") < 0 || StringFind(u, "USD") < 0)
        {
         log.Error("symbol " + sym + " is not XAUUSD: this EA is specialised on gold only");
         return false;
        }
      //--- mode enforcement
      if(tester)
        {
         if(mode != XQ_MODE_BACKTEST)
            log.Warn("running in the Strategy Tester: mode forced to BACKTEST");
         effective = XQ_MODE_BACKTEST;
        }
      else
        {
         if(mode == XQ_MODE_BACKTEST)
           {
            log.Error("BACKTEST mode only runs in the Strategy Tester. Choose DEMO or LIVE.");
            return false;
           }
         if(mode == XQ_MODE_DEMO && tradeMode == ACCOUNT_TRADE_MODE_REAL)
           {
            log.Error("DEMO mode refused on a REAL account. Use LIVE mode with explicit confirmation.");
            return false;
           }
         if(mode == XQ_MODE_LIVE)
           {
            if(liveConfirm != XQ_LIVE_CONFIRM_PHRASE)
              {
               log.Error("LIVE mode requires InpLiveConfirmation = \"" + XQ_LIVE_CONFIRM_PHRASE + "\"");
               return false;
              }
            if(liveLogin != login)
              {
               log.Error(StringFormat("LIVE mode: InpLiveAccount (%I64d) does not match the connected account (%I64d)",
                                      liveLogin, login));
               return false;
              }
            if(tradeMode != ACCOUNT_TRADE_MODE_REAL)
               log.Warn("LIVE mode on a non-real account (demo/contest): allowed, but no real money is at stake");
           }
        }
      //--- contract specification sanity
      double vmin = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN), vstep = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
      double tv = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE), ts = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
      double cs = SymbolInfoDouble(sym, SYMBOL_TRADE_CONTRACT_SIZE);
      if(vmin <= 0 || vstep <= 0 || tv <= 0 || ts <= 0 || cs <= 0)
        {
         log.Error(StringFormat("invalid contract spec vmin=%g step=%g tickvalue=%g ticksize=%g contract=%g",
                                vmin, vstep, tv, ts, cs));
         return false;
        }
      long smode = SymbolInfoInteger(sym, SYMBOL_TRADE_MODE);
      if(smode == SYMBOL_TRADE_MODE_DISABLED || smode == SYMBOL_TRADE_MODE_CLOSEONLY)
        {
         log.Error("symbol trading disabled or close-only on this account");
         return false;
        }
      m_netting = (AccountInfoInteger(ACCOUNT_MARGIN_MODE) != ACCOUNT_MARGIN_MODE_RETAIL_HEDGING);
      log.Info(StringFormat("account %I64d %s %s currency=%s leverage=1:%I64d balance=%.2f mode=%s %s",
                            login, AccountInfoString(ACCOUNT_COMPANY), AccountInfoString(ACCOUNT_SERVER),
                            AccountInfoString(ACCOUNT_CURRENCY), AccountInfoInteger(ACCOUNT_LEVERAGE),
                            AccountInfoDouble(ACCOUNT_BALANCE),
                            tradeMode == ACCOUNT_TRADE_MODE_REAL ? "REAL" : (tradeMode == ACCOUNT_TRADE_MODE_DEMO ? "DEMO" : "CONTEST"),
                            m_netting ? "NETTING (max 1 position)" : "HEDGING"));
      log.Info(StringFormat("%s contract=%g vmin=%g step=%g vmax=%g digits=%d stops=%d freeze=%d tickvalue=%g ticksize=%g",
                            sym, cs, vmin, vstep, SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX),
                            (int)SymbolInfoInteger(sym, SYMBOL_DIGITS), (int)SymbolInfoInteger(sym, SYMBOL_TRADE_STOPS_LEVEL),
                            (int)SymbolInfoInteger(sym, SYMBOL_TRADE_FREEZE_LEVEL), tv, ts));
      return true;
     }

   //--- feasibility of the risk settings on this account (informative)
   void              SmallAccountReport(const double riskPct, const double hardCapPct, const double typicalSlPrice)
     {
      double pl = 0.0;
      double bid = SymbolInfoDouble(m_sym, SYMBOL_BID);
      double vmin = SymbolInfoDouble(m_sym, SYMBOL_VOLUME_MIN);
      if(bid <= 0 || !OrderCalcProfit(ORDER_TYPE_BUY, m_sym, vmin, bid, bid - typicalSlPrice, pl))
         return;
      double cap = MathMin(AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY));
      double pct = (cap > 0) ? 100.0 * (-pl) / cap : 100.0;
      double maxSl = (pl != 0.0) ? typicalSlPrice * (cap * hardCapPct / 100.0) / (-pl) : 0.0;
      string msg = StringFormat("min lot %.2f with a %.2f stop risks %.2f %s = %.2f%% of capital (target %.2f%%, hard cap %.2f%%). "
                                "Largest stop allowed at min lot: %.2f in price.",
                                vmin, typicalSlPrice, -pl, AccountInfoString(ACCOUNT_CURRENCY), pct, riskPct, hardCapPct, maxSl);
      if(pct > hardCapPct)
         m_log.Warn("ACCOUNT TOO SMALL FOR TYPICAL GOLD STOPS: " + msg +
                    " Most signals will be refused. Consider a cent account or a broker with 0.001 lots.");
      else
         m_log.Info(msg);
     }

   //--- runtime: may we send orders right now?
   bool              TradingAllowed(string &why)
     {
      if(!TerminalInfoInteger(TERMINAL_CONNECTED) && !MQLInfoInteger(MQL_TESTER))
        { why = "terminal_disconnected"; return false; }
      if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) && !MQLInfoInteger(MQL_TESTER))
        { why = "algo_trading_disabled_in_terminal"; return false; }
      if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
        { why = "ea_trading_not_allowed"; return false; }
      if(!AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) || !AccountInfoInteger(ACCOUNT_TRADE_EXPERT))
        { why = "account_trading_not_allowed"; return false; }
      long smode = SymbolInfoInteger(m_sym, SYMBOL_TRADE_MODE);
      if(smode != SYMBOL_TRADE_MODE_FULL)
        { why = "symbol_not_fully_tradable"; return false; }
      if(TimeCurrent() < m_pauseUntil)
        { why = "paused:" + m_pauseReason; return false; }
      why = "";
      return true;
     }

   void              Pause(const int minutes, const string reason)
     {
      datetime until = TimeCurrent() + minutes * 60;
      if(until > m_pauseUntil)
        {
         m_pauseUntil = until;
         m_pauseReason = reason;
         m_log.Warn(StringFormat("new entries paused %d min: %s", minutes, reason));
        }
     }

   bool              Paused(void) const { return TimeCurrent() < m_pauseUntil; }

   //--- tick freshness (live only)
   bool              TickFresh(const int maxAgeSec)
     {
      if(MQLInfoInteger(MQL_TESTER))
         return true;
      MqlTick t;
      if(!SymbolInfoTick(m_sym, t))
         return false;
      return (TimeTradeServer() - t.time <= maxAgeSec);
     }

   //--- abnormal candle: last closed M1 range versus M5 ATR
   bool              AbnormalCandle(const double m1Range, const double atrM5, const double mult)
     {
      return (atrM5 > 0 && m1Range > mult * atrM5);
     }

   //--- kill switch file (written by the dashboard or by hand)
   bool              KillSwitch(void)
     {
      return FileIsExist(XQAI_FOLDER + "STOP", FILE_COMMON);
     }
  };

#endif
