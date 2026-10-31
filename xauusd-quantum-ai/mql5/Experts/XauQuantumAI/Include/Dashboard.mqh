//+------------------------------------------------------------------+
//| Dashboard.mqh - on-chart panel, STOP/PAUSE buttons, status.json  |
//+------------------------------------------------------------------+
#ifndef XQAI_DASHBOARD_MQH
#define XQAI_DASHBOARD_MQH

#include "Defines.mqh"

#define XQ_DASH_PREFIX "XQAI_D_"
#define XQ_DASH_LINES  22

struct XQStatus
  {
   string            mode, aiState, regime, strategy, signal, session, news, halt, lastDecision, nextEvent;
   double            balance, equity, dayPnl, totalPnl, ddPct, winRate, profitFactor, riskOpen, score, prob;
   int               trades, positions, tradesToday;
   bool              paused;
  };

class CDashboard
  {
private:
   bool              m_enabled;
   int               m_x, m_y;

   void              Label(const int row, const string text, const color clr)
     {
      string name = XQ_DASH_PREFIX + IntegerToString(row);
      if(ObjectFind(0, name) < 0)
        {
         ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
         ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
         ObjectSetInteger(0, name, OBJPROP_XDISTANCE, m_x);
         ObjectSetInteger(0, name, OBJPROP_YDISTANCE, m_y + row * 16);
         ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
         ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
         ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
         ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
        }
      ObjectSetString(0, name, OBJPROP_TEXT, text);
      ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
     }

   void              Button(const string id, const string text, const int x, const color bg)
     {
      string name = XQ_DASH_PREFIX + id;
      if(ObjectFind(0, name) < 0)
        {
         ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
         ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
         ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
         ObjectSetInteger(0, name, OBJPROP_YDISTANCE, m_y + XQ_DASH_LINES * 16 + 6);
         ObjectSetInteger(0, name, OBJPROP_XSIZE, 110);
         ObjectSetInteger(0, name, OBJPROP_YSIZE, 22);
         ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
         ObjectSetInteger(0, name, OBJPROP_COLOR, clrWhite);
        }
      ObjectSetString(0, name, OBJPROP_TEXT, text);
      ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg);
      ObjectSetInteger(0, name, OBJPROP_STATE, false);
     }

   string            J(const string k, const string v)
     {
      string x = v;
      StringReplace(x, "\\", "/");
      StringReplace(x, "\"", "'");
      return "\"" + k + "\":\"" + x + "\"";
     }
   string            N(const string k, const double v) { return "\"" + k + "\":" + DoubleToString(v, 4); }

public:
                     CDashboard(void) : m_enabled(true), m_x(10), m_y(20) {}

   void              Init(const bool enabled)
     {
      m_enabled = enabled && !MQLInfoInteger(MQL_OPTIMIZATION);
      if(!m_enabled)
         return;
      string bg = XQ_DASH_PREFIX + "bg";
      if(ObjectFind(0, bg) < 0)
        {
         ObjectCreate(0, bg, OBJ_RECTANGLE_LABEL, 0, 0, 0);
         ObjectSetInteger(0, bg, OBJPROP_XDISTANCE, m_x - 6);
         ObjectSetInteger(0, bg, OBJPROP_YDISTANCE, m_y - 6);
         ObjectSetInteger(0, bg, OBJPROP_XSIZE, 470);
         ObjectSetInteger(0, bg, OBJPROP_YSIZE, XQ_DASH_LINES * 16 + 40);
         ObjectSetInteger(0, bg, OBJPROP_BGCOLOR, C'18,22,34');
         ObjectSetInteger(0, bg, OBJPROP_BORDER_TYPE, BORDER_FLAT);
         ObjectSetInteger(0, bg, OBJPROP_SELECTABLE, false);
         ObjectSetInteger(0, bg, OBJPROP_HIDDEN, true);
        }
     }

   void              Destroy(void) { ObjectsDeleteAll(0, XQ_DASH_PREFIX); }

   void              Update(const XQStatus &s)
     {
      if(!m_enabled)
         return;
      color ok = clrLightGreen, wn = clrOrange, bad = clrTomato, tx = clrWhiteSmoke, hd = clrGold;
      int r = 0;
      Label(r++, "XAUUSD QUANTUM AI  v" + XQAI_VERSION + "   mode " + s.mode, hd);
      Label(r++, StringFormat("Balance %.2f   Equity %.2f", s.balance, s.equity), tx);
      Label(r++, StringFormat("P/L day %+.2f   P/L total %+.2f", s.dayPnl, s.totalPnl), s.dayPnl >= 0 ? ok : bad);
      Label(r++, StringFormat("Drawdown %.2f%%   Risk open %.2f", s.ddPct, s.riskOpen), s.ddPct < 3 ? tx : wn);
      Label(r++, StringFormat("Trades %d (today %d)   WinRate %.1f%%   PF %.2f", s.trades, s.tradesToday, s.winRate,
                              s.profitFactor), tx);
      Label(r++, StringFormat("Positions %d", s.positions), tx);
      Label(r++, "------------------------------------------------", clrDimGray);
      Label(r++, "Regime    : " + s.regime, tx);
      Label(r++, "Session   : " + s.session, tx);
      Label(r++, "Signal    : " + s.signal, tx);
      Label(r++, "Strategy  : " + s.strategy, tx);
      Label(r++, StringFormat("Score     : %.1f / 100", s.score), s.score >= 65 ? ok : tx);
      Label(r++, StringFormat("AI prob   : %s", s.prob >= 0 ? DoubleToString(s.prob, 3) : "-"), tx);
      Label(r++, "AI state  : " + s.aiState, (StringFind(s.aiState, "OK") >= 0 || s.aiState == "OFF") ? tx : wn);
      Label(r++, "News      : " + s.news, StringFind(s.news, "BLOCK") >= 0 ? wn : tx);
      Label(r++, "Next event: " + s.nextEvent, tx);
      Label(r++, "Decision  : " + s.lastDecision, tx);
      Label(r++, "------------------------------------------------", clrDimGray);
      Label(r++, "State     : " + (s.halt != "" ? "HALTED - " + s.halt : (s.paused ? "PAUSED (manual)" : "RUNNING")),
            s.halt != "" ? bad : (s.paused ? wn : ok));
      while(r < XQ_DASH_LINES)
         Label(r++, " ", tx);
      Button("stop", "STOP + CLOSE", m_x, clrFireBrick);
      Button("pause", s.paused ? "RESUME" : "PAUSE", m_x + 120, s.paused ? clrSeaGreen : clrDarkOrange);
      ChartRedraw(0);
     }

   //--- returns "stop", "pause" or "" for a chart click event
   string            Clicked(const string objName)
     {
      if(objName == XQ_DASH_PREFIX + "stop")
         return "stop";
      if(objName == XQ_DASH_PREFIX + "pause")
         return "pause";
      return "";
     }

   void              WriteStatus(const XQStatus &s)
     {
      if(MQLInfoInteger(MQL_OPTIMIZATION))
         return;
      string js = "{" + J("time", TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS)) + "," + J("mode", s.mode) + ","
                  + N("balance", s.balance) + "," + N("equity", s.equity) + "," + N("day_pnl", s.dayPnl) + ","
                  + N("total_pnl", s.totalPnl) + "," + N("drawdown_pct", s.ddPct) + "," + N("win_rate", s.winRate) + ","
                  + N("profit_factor", s.profitFactor) + "," + N("risk_open", s.riskOpen) + ","
                  + "\"trades\":" + IntegerToString(s.trades) + "," + "\"trades_today\":" + IntegerToString(s.tradesToday) + ","
                  + "\"positions\":" + IntegerToString(s.positions) + "," + J("regime", s.regime) + ","
                  + J("session", s.session) + "," + J("signal", s.signal) + "," + J("strategy", s.strategy) + ","
                  + N("score", s.score) + "," + N("ai_prob", s.prob) + "," + J("ai_state", s.aiState) + ","
                  + J("news", s.news) + "," + J("next_event", s.nextEvent) + "," + J("last_decision", s.lastDecision) + ","
                  + J("halt", s.halt) + "," + "\"paused\":" + (s.paused ? "true" : "false") + "}";
      string suffix = MQLInfoInteger(MQL_TESTER) ? "_tester" : "";
      string tmp = XQAI_FOLDER + "status" + suffix + ".tmp";
      int h = FileOpen(tmp, FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON);
      if(h == INVALID_HANDLE)
         return;
      FileWriteString(h, js);
      FileClose(h);
      FileMove(tmp, FILE_COMMON, XQAI_FOLDER + "status" + suffix + ".json", FILE_COMMON | FILE_REWRITE);
     }
  };

#endif
