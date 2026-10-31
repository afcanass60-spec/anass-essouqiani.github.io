//+------------------------------------------------------------------+
//| Logger.mqh - log file + decision and trade journals (CSV)        |
//| Files in <Common>\Files\XQAI\ so the Python dashboard can read.  |
//+------------------------------------------------------------------+
#ifndef XQAI_LOGGER_MQH
#define XQAI_LOGGER_MQH

#include "Defines.mqh"

enum ENUM_XQ_LOG { XQ_LOG_DEBUG = 0, XQ_LOG_INFO = 1, XQ_LOG_WARN = 2, XQ_LOG_ERROR = 3 };

class CLogger
  {
private:
   ENUM_XQ_LOG       m_level;
   string            m_suffix;
   bool              m_toFile;

   void              Append(const string file, const string line, const string header)
     {
      bool exists = FileIsExist(file, FILE_COMMON);
      int h = FileOpen(file, FILE_READ | FILE_WRITE | FILE_TXT | FILE_ANSI | FILE_COMMON | FILE_SHARE_READ);
      if(h == INVALID_HANDLE)
         return;
      FileSeek(h, 0, SEEK_END);
      if(!exists && header != "")
         FileWriteString(h, header + "\r\n");
      FileWriteString(h, line + "\r\n");
      FileClose(h);
     }

public:
                     CLogger(void) : m_level(XQ_LOG_INFO), m_suffix(""), m_toFile(true) {}

   void              Init(const ENUM_XQ_LOG level, const bool toFile)
     {
      m_level = level;
      m_toFile = toFile;
      m_suffix = MQLInfoInteger(MQL_TESTER) ? "_tester" : "";
      FolderCreate("XQAI", FILE_COMMON);
     }

   string            Suffix(void) const { return m_suffix; }

   void              Write(const ENUM_XQ_LOG lvl, const string msg)
     {
      if(lvl < m_level)
         return;
      string tag = (lvl == XQ_LOG_DEBUG) ? "DEBUG" : (lvl == XQ_LOG_INFO) ? "INFO" : (lvl == XQ_LOG_WARN) ? "WARN" : "ERROR";
      string line = TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS) + " " + tag + " " + msg;
      Print("[XQAI] ", tag, " ", msg);
      if(m_toFile && !MQLInfoInteger(MQL_OPTIMIZATION))
        {
         MqlDateTime s;
         TimeToStruct(TimeCurrent(), s);
         Append(XQAI_FOLDER + StringFormat("log_%04d%02d%02d%s.txt", s.year, s.mon, s.day, m_suffix), line, "");
        }
     }

   void              Debug(const string m) { Write(XQ_LOG_DEBUG, m); }
   void              Info(const string m)  { Write(XQ_LOG_INFO, m); }
   void              Warn(const string m)  { Write(XQ_LOG_WARN, m); }
   void              Error(const string m) { Write(XQ_LOG_ERROR, m); }

   //--- one line per evaluated opportunity (taken or refused, with the reason)
   void              Decision(const datetime t, const XQCandidate &c, const double prob, const string session,
                              const string decision)
     {
      if(MQLInfoInteger(MQL_OPTIMIZATION))
         return;
      string line = StringFormat("%s,%s,%d,%s,%.2f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.3f,%.4f,%s,%.2f,%s",
                                 TimeToString(t, TIME_DATE | TIME_MINUTES), XQ_StrategyName(c.strategy), c.dir,
                                 XQ_RegimeName(c.regime), c.score, c.comp[0], c.comp[1], c.comp[2], c.comp[3],
                                 c.comp[4], c.comp[5], c.comp[6], prob, session, c.rr, decision);
      Append(XQAI_FOLDER + "journal_decisions" + m_suffix + ".csv", line,
             "time,strategy,dir,regime,score,structure,trend,momentum,liquidity,volatility,price_action,mtf,"
             "ai_prob,session,rr,decision");
     }

   void              Trade(const string event, const ulong ticket, const string strategy, const int dir,
                           const double lots, const double price, const double sl, const double tp,
                           const double pnl, const double r, const string reason)
     {
      if(MQLInfoInteger(MQL_OPTIMIZATION))
         return;
      string line = StringFormat("%s,%s,%I64u,%s,%d,%.2f,%.3f,%.3f,%.3f,%.2f,%.3f,%s",
                                 TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS), event, ticket, strategy, dir,
                                 lots, price, sl, tp, pnl, r, reason);
      Append(XQAI_FOLDER + "journal_trades" + m_suffix + ".csv", line,
             "time,event,ticket,strategy,dir,lots,price,sl,tp,pnl,r,reason");
     }

   //--- features of every evaluated best candidate, for the Python parity check
   void              Features(const datetime decisionServerTime, const XQCandidate &c, const double &f[])
     {
      string line = StringFormat("%I64d,%s,%d", (long)decisionServerTime, XQ_StrategyName(c.strategy), c.dir);
      for(int k = 0; k < ArraySize(f); k++)
         line += "," + DoubleToString(f[k], 8);
      string header = "time,strategy,dir";
      for(int k = 0; k < XQAI_N_FEATURES; k++)
         header += ",f" + IntegerToString(k);
      Append(XQAI_FOLDER + "XQAI_features_dump" + m_suffix + ".csv", line, header);
     }
  };

#endif
